import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/producto";
import NivelStock from "@/models/nivelStock";
import Sucursal from "@/models/sucursal";
import { getDefaultWarehouseId } from "@/modules/inventory/application/branch-stock.service";
import type { Variante } from "@/types/producto";
import { findVariantByIdentity } from "@/utils/varianteIdentity";
import { AppError } from "@/shared/errors/AppError";
import { inventoryRepository } from "@/modules/inventory/infrastructure/inventory.repository";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import {
  getVariantAvailableStock,
  getVariantReservedStock,
} from "@/modules/catalog/domain/variant.utils";
import { runInTransaction } from "@/shared/db/runTransaction";
import { assertObjectId } from "@/utils/validacion";

type VariantLookup = {
  varianteId?: string;
  color?: string;
  colorSecundario?: string;
  talla?: string;
};

type ProductoWithVariants = {
  _id: string | mongoose.Types.ObjectId;
  nombre: string;
  modelo: string;
  sku: string;
  save: (options?: { session?: ClientSession }) => Promise<unknown>;
};

type VariantWithStock = Variante & {
  stock: number;
  stockReservado?: number;
};

type RecordInventoryMovementInput = {
  producto: ProductoWithVariants;
  variante: VariantWithStock;
  tipo:
    | "ENTRADA"
    | "SALIDA"
    | "AJUSTE"
    | "DEVOLUCION"
    | "TRASPASO_SALIDA"
    | "TRASPASO_ENTRADA";
  cantidad: number;
  stockAnterior: number;
  stockActual: number;
  motivo?: string;
  referencia?: string;
  userId: string | mongoose.Types.ObjectId;
  costoUnitario?: number;
  valorTotalOperacion?: number;
  costoPromedioResultante?: number;
  saldoValorado?: number;
  compraId?: mongoose.Types.ObjectId | string;
  sucursalId?: mongoose.Types.ObjectId | string;
};

type AdjustInventoryInput = VariantLookup & {
  productoId: string;
  cantidad: number;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE" | "DEVOLUCION";
  motivo?: string;
  referencia?: string;
  userIdRaw: string;
  rolActor: "ADMIN" | "VENDEDOR";
  sucursalId?: string;
};

type ConsumeStockForSaleInput = {
  producto: ProductoWithVariants & { totalVendidos: number };
  variante: VariantWithStock;
  cantidad: number;
  userId: string;
  referencia?: string;
  motivo?: string;
  sucursalId?: mongoose.Types.ObjectId | string;
};

type InventoryMovementRecord = Awaited<
  ReturnType<typeof inventoryRepository.create>
>;

type AdjustInventoryResult = {
  producto: ProductoWithVariants;
  variante: VariantWithStock;
  movimiento: InventoryMovementRecord;
};



function resolveVariant(
  variants: Variante[],
  lookup: VariantLookup
): VariantWithStock {
  const variante = findVariantByIdentity(variants, lookup);

  if (!variante) {
    throw new AppError("Variante no encontrada", 404);
  }

  return variante as VariantWithStock;
}

export async function listInventoryMovements() {
  await connectDB();
  return inventoryRepository.listAll();
}

export async function listInventoryMovementsByProduct(productoId: string) {
  assertObjectId(productoId, "ID de producto inválido");
  await connectDB();
  return inventoryRepository.listByProduct(productoId);
}

export async function recordInventoryMovement({
  producto,
  variante,
  tipo,
  cantidad,
  stockAnterior,
  stockActual,
  motivo,
  referencia,
  userId,
  costoUnitario,
  valorTotalOperacion,
  costoPromedioResultante,
  saldoValorado,
  compraId,
  sucursalId,
}: RecordInventoryMovementInput, session?: ClientSession) {
  const validUserId = mongoose.Types.ObjectId.isValid(userId.toString())
    ? userId
    : undefined;

  const finalSucursalId = sucursalId
    ? new mongoose.Types.ObjectId(sucursalId.toString())
    : await getDefaultWarehouseId(session);

  return inventoryRepository.create({
    productoId: producto._id,
    sucursalId: finalSucursalId,
    productoSnapshot: {
      nombre: producto.nombre,
      modelo: producto.modelo,
      sku: producto.sku,
    },
    variante: {
      varianteId: variante.varianteId,
      color: variante.color,
      colorSecundario: variante.colorSecundario,
      talla: variante.talla,
      codigoBarra: variante.codigoBarra,
    },
    tipo,
    cantidad,
    stockAnterior,
    stockActual,
    motivo,
    referencia,
    costoUnitario,
    valorTotalOperacion,
    costoPromedioResultante,
    saldoValorado,
    compraId,
    usuario: validUserId as mongoose.Types.ObjectId | undefined,
  }, session);
}

export function getAvailableStockForVariant(variante: VariantWithStock) {
  return getVariantAvailableStock(variante);
}

export async function reserveStockForOrder({
  producto,
  variante,
  cantidad,
  sucursalId,
}: {
  producto: ProductoWithVariants;
  variante: VariantWithStock;
  cantidad: number;
  sucursalId?: mongoose.Types.ObjectId | string;
}, session?: ClientSession) {
  if (getAvailableStockForVariant(variante) < cantidad) {
    throw new AppError(`Stock insuficiente (${producto.nombre})`, 400);
  }

  const targetSucursalId =
    sucursalId || (await getDefaultWarehouseId(session));

  // Verificar y reservar en NivelStock de la sucursal de despacho
  await NivelStock.findOneAndUpdate(
    {
      sucursalId: targetSucursalId,
      varianteId: variante.varianteId,
    },
    { $inc: { stockReservado: cantidad } },
    { session: session ?? undefined }
  );

  variante.stockReservado = getVariantReservedStock(variante) + cantidad;
  await producto.save(session ? { session } : undefined);

  return {
    stockReservado: variante.stockReservado,
    availableStock: getAvailableStockForVariant(variante),
  };
}

export async function releaseReservedStockForOrder({
  producto,
  variante,
  cantidad,
  sucursalId,
}: {
  producto: ProductoWithVariants;
  variante: VariantWithStock;
  cantidad: number;
  sucursalId?: mongoose.Types.ObjectId | string;
}, session?: ClientSession) {
  variante.stockReservado = Math.max(
    0,
    getVariantReservedStock(variante) - cantidad
  );
  await producto.save(session ? { session } : undefined);

  const targetSucursalId =
    sucursalId || (await getDefaultWarehouseId(session));

  const updatedNivel = await NivelStock.findOneAndUpdate(
    { sucursalId: targetSucursalId, varianteId: variante.varianteId },
    { $inc: { stockReservado: -cantidad } },
    { new: true, session: session ?? undefined }
  );

  if (updatedNivel && updatedNivel.stockReservado < 0) {
    updatedNivel.stockReservado = 0;
    await updatedNivel.save(session ? { session } : undefined);
  }

  return {
    stockReservado: variante.stockReservado,
    availableStock: getAvailableStockForVariant(variante),
  };
}

export async function consumeReservedStockForOrder({
  producto,
  variante,
  cantidad,
  userId,
  referencia = "ORDER_CONFIRM",
  motivo = "Confirmacion de pedido",
  sucursalId,
}: ConsumeStockForSaleInput, session?: ClientSession) {
  const stockReservado = getVariantReservedStock(variante);

  if (stockReservado < cantidad) {
    throw new AppError(
      `La reserva de stock ya no es suficiente (${producto.nombre})`,
      409
    );
  }

  if (variante.stock < cantidad) {
    throw new AppError(`Stock insuficiente (${producto.nombre})`, 400);
  }

  const stockAnterior = variante.stock;
  const stockActual = stockAnterior - cantidad;

  variante.stock = stockActual;
  variante.stockReservado = stockReservado - cantidad;
  producto.totalVendidos += cantidad;
  await producto.save(session ? { session } : undefined);

  const targetSucursalId =
    sucursalId || (await getDefaultWarehouseId(session));

  // Actualizar NivelStock por sucursal
  await NivelStock.findOneAndUpdate(
    { sucursalId: targetSucursalId, varianteId: variante.varianteId },
    { $inc: { stockFisico: -cantidad, stockReservado: -cantidad } },
    { session }
  );

  const costoUnitario = Number(
    variante.precioCosto !== undefined && variante.precioCosto !== null && Number(variante.precioCosto) > 0
      ? variante.precioCosto
      : (producto as unknown as { precioCosto?: number }).precioCosto || 0
  );
  const valorTotalOperacion = Number((cantidad * costoUnitario).toFixed(2));
  const saldoValorado = Number((stockActual * costoUnitario).toFixed(2));

  const movimiento = await recordInventoryMovement({
    producto,
    variante,
    sucursalId: targetSucursalId,
    tipo: "SALIDA",
    cantidad,
    stockAnterior,
    stockActual,
    motivo,
    referencia,
    userId,
    costoUnitario,
    valorTotalOperacion,
    costoPromedioResultante: costoUnitario,
    saldoValorado,
  }, session);

  return {
    stockAnterior,
    stockActual,
    stockReservado: variante.stockReservado,
    availableStock: getAvailableStockForVariant(variante),
    movimiento,
  };
}

export async function adjustInventoryStock({
  productoId,
  varianteId,
  color,
  colorSecundario,
  talla,
  cantidad,
  tipo,
  motivo,
  referencia = "AJUSTE_MANUAL",
  userIdRaw,
  rolActor,
  sucursalId,
}: AdjustInventoryInput, session?: ClientSession): Promise<AdjustInventoryResult> {
  if (!session) {
    return runInTransaction(async (transactionSession) =>
      adjustInventoryStock(
        {
          productoId,
          varianteId,
          color,
          colorSecundario,
          talla,
          cantidad,
          tipo,
          motivo,
          referencia,
          userIdRaw,
          rolActor,
          sucursalId,
        },
        transactionSession
      )
    );
  }

  assertObjectId(userIdRaw, "Usuario no autenticado");

  await connectDB();

  const producto = await Producto.findById(productoId).session(session ?? null);
  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const variante = resolveVariant(producto.variantes as Variante[], {
    varianteId,
    color,
    colorSecundario,
    talla,
  });

  const qty = Math.abs(cantidad);
  const stockAnterior = variante.stock;
  let stockActual = stockAnterior;
  const stockReservado = getVariantReservedStock(variante);

  if (tipo === "ENTRADA") {
    stockActual += qty;
  } else if (tipo === "SALIDA") {
    if (getAvailableStockForVariant(variante) < qty) {
      throw new AppError("Stock insuficiente para salida", 400);
    }
    stockActual -= qty;
  } else if (tipo === "AJUSTE") {
    if (qty < stockReservado) {
      throw new AppError(
        "El stock fisico no puede quedar por debajo del stock reservado",
        400
      );
    }
    stockActual = qty;
  } else {
    throw new AppError("Tipo de movimiento inválido", 400);
  }

  variante.stock = stockActual;
  await producto.save(session ? { session } : undefined);

  const targetSucursalId =
    sucursalId || (await getDefaultWarehouseId(session));

  // Actualizar NivelStock por sucursal
  if (tipo === "ENTRADA") {
    await NivelStock.findOneAndUpdate(
      { sucursalId: targetSucursalId, varianteId: variante.varianteId },
      {
        $inc: { stockFisico: qty },
        $setOnInsert: { productoId: producto._id, stockReservado: 0, stockMinimo: 2 },
      },
      { upsert: true, session: session ?? undefined }
    );
  } else if (tipo === "SALIDA") {
    await NivelStock.findOneAndUpdate(
      { sucursalId: targetSucursalId, varianteId: variante.varianteId },
      { $inc: { stockFisico: -qty } },
      { session: session ?? undefined }
    );
  } else if (tipo === "AJUSTE") {
    await NivelStock.findOneAndUpdate(
      { sucursalId: targetSucursalId, varianteId: variante.varianteId },
      {
        $set: { stockFisico: qty },
        $setOnInsert: { productoId: producto._id, stockReservado: 0, stockMinimo: 2 },
      },
      { upsert: true, session: session ?? undefined }
    );
  }

  const movimiento = await recordInventoryMovement({
    producto,
    variante,
    sucursalId: targetSucursalId,
    tipo,
    cantidad: qty,
    stockAnterior,
    stockActual,
    motivo,
    referencia,
    userId: new mongoose.Types.ObjectId(userIdRaw),
  }, session);

  await recordAuditEventSafe(
    {
      accion: "INVENTORY_ADJUSTED",
      tipoEntidad: "INVENTORY_MOVEMENT",
      idEntidad: movimiento._id.toString(),
      idActor: userIdRaw,
      rolActor,
      estado: "SUCCESS",
      metadata: {
        productoId,
        varianteId: variante.varianteId || null,
        tipo,
        cantidad: qty,
        stockAnterior,
        stockActual,
        sucursalId: targetSucursalId.toString(),
      },
    },
    session
  );

  return { producto, variante, movimiento };
}

export async function consumeStockForSale({
  producto,
  variante,
  cantidad,
  userId,
  referencia = "VENTA",
  motivo = "Venta",
  sucursalId,
}: ConsumeStockForSaleInput, session?: ClientSession) {
  if (getAvailableStockForVariant(variante) < cantidad) {
    throw new AppError(`Stock insuficiente (${producto.nombre})`, 400);
  }

  const targetSucursalId =
    sucursalId || (await getDefaultWarehouseId(session));

  // Verificar y descontar en NivelStock de la sucursal correspondiente
  let nivelEnSucursal = await NivelStock.findOne(
    { sucursalId: targetSucursalId, varianteId: variante.varianteId },
    null,
    session ? { session } : undefined
  );

  // Salvaguarda Legacy: si no existe registro en la sucursal pero tampoco existe ningún otro registro de NivelStock
  // para esta variante en todo el sistema (producto importado o anterior a migración) y la variante tiene stock físico
  if (!nivelEnSucursal) {
    const totalNivelesVariante = await NivelStock.countDocuments(
      { varianteId: variante.varianteId },
      session ? { session } : undefined
    );

    if (totalNivelesVariante === 0 && Number(variante.stock || 0) >= cantidad) {
      const nuevoNivel = new NivelStock({
        sucursalId: targetSucursalId,
        productoId: producto._id,
        varianteId: variante.varianteId,
        stockFisico: Math.max(0, Number(variante.stock || 0)),
        stockReservado: 0,
        stockMinimo: 2,
      });
      await nuevoNivel.save(session ? { session } : undefined);
      nivelEnSucursal = nuevoNivel;
    }
  }

  const stockSucursalDisponible = nivelEnSucursal
    ? Math.max(0, Number(nivelEnSucursal.stockFisico || 0) - Number(nivelEnSucursal.stockReservado || 0))
    : 0;

  if (stockSucursalDisponible < cantidad) {
    // Buscar en qué otras sucursales sí hay existencias para orientar al vendedor
    const otrosNiveles = await NivelStock.find(
      { varianteId: variante.varianteId, stockFisico: { $gt: 0 } },
      null,
      session ? { session } : undefined
    ).populate("sucursalId", "nombre codigo");

    const sucursalTargetDoc = await Sucursal.findById(targetSucursalId)
      .select("nombre")
      .session(session ? session : null);
    const nombreSucursal = sucursalTargetDoc?.nombre || "la sucursal seleccionada";

    if (otrosNiveles.length > 0) {
      const listaDisponibles = otrosNiveles
        .map((n) => {
          const disp = Math.max(0, Number(n.stockFisico || 0) - Number(n.stockReservado || 0));
          const sNom = (n.sucursalId as { nombre?: string })?.nombre || "Otra sucursal";
          return `${sNom} (${disp} disp.)`;
        })
        .join(", ");

      throw new AppError(
        `Stock insuficiente en ${nombreSucursal} para ${producto.nombre} (${variante.color}/${variante.talla}). Disponible aquí: ${stockSucursalDisponible}. Hay existencias en: ${listaDisponibles}. Por favor seleccione en la cabecera del POS la sucursal que posee el stock o efectúe un traspaso de mercadería.`,
        400
      );
    }

    throw new AppError(
      `Stock insuficiente en ${nombreSucursal} para ${producto.nombre} (${variante.color}/${variante.talla}). Disponible: ${stockSucursalDisponible}`,
      400
    );
  }

  await NivelStock.findOneAndUpdate(
    { sucursalId: targetSucursalId, varianteId: variante.varianteId },
    { $inc: { stockFisico: -cantidad } },
    { session: session ?? undefined }
  );

  const stockAnterior = variante.stock;
  const stockActual = stockAnterior - cantidad;

  variante.stock = stockActual;
  producto.totalVendidos += cantidad;
  await producto.save(session ? { session } : undefined);

  const movimiento = await recordInventoryMovement({
    producto,
    variante,
    sucursalId: targetSucursalId,
    tipo: "SALIDA",
    cantidad,
    stockAnterior,
    stockActual,
    motivo,
    referencia,
    userId,
  }, session);

  return { stockAnterior, stockActual, movimiento };
}
