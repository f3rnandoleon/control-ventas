import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/producto";
import NivelStock from "@/models/nivelStock";
import Sucursal from "@/models/sucursal";
import { getDefaultWarehouseId } from "@/modules/inventory/application/branch-stock.service";
import type { Variante } from "@/types/producto";
import { createVariantId, findVariantByIdentity } from "@/utils/varianteIdentity";
import { generarCodigoVariante } from "@/utils/generarCodigoVariante";
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

  const targetSucursalId = sucursalId
    ? new mongoose.Types.ObjectId(sucursalId.toString())
    : await getDefaultWarehouseId(session);

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
      {
        $inc: { stockFisico: -qty },
        $setOnInsert: { productoId: producto._id, stockReservado: 0, stockMinimo: 2 },
      },
      { upsert: true, session: session ?? undefined }
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

  const cantidadMovimiento =
    tipo === "AJUSTE" ? Math.abs(stockActual - stockAnterior) : qty;

  const costoUnitario = Number(
    variante.precioCosto !== undefined && variante.precioCosto !== null && Number(variante.precioCosto) > 0
      ? variante.precioCosto
      : (producto as unknown as { precioCosto?: number }).precioCosto || 0
  );
  const valorTotalOperacion = Number((cantidadMovimiento * costoUnitario).toFixed(2));
  const saldoValorado = Number((stockActual * costoUnitario).toFixed(2));

  const movimiento = await recordInventoryMovement({
    producto,
    variante,
    sucursalId: targetSucursalId,
    tipo,
    cantidad: cantidadMovimiento,
    stockAnterior,
    stockActual,
    motivo,
    referencia,
    userId: new mongoose.Types.ObjectId(userIdRaw),
    costoUnitario,
    valorTotalOperacion,
    costoPromedioResultante: costoUnitario,
    saldoValorado,
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

  return { stockAnterior, stockActual, movimiento };
}

type ReclassifyVariantInput = {
  productoId: string;
  sucursalId?: string;
  varianteOrigenId?: string;
  origenColor?: string;
  origenColorSecundario?: string;
  origenTalla?: string;
  varianteDestinoId?: string;
  crearNuevaVariante?: boolean;
  destinoColor?: string;
  destinoColorSecundario?: string;
  destinoTalla?: string;
  cantidad: number;
  motivo?: string;
  referencia?: string;
  userIdRaw: string;
  rolActor: "ADMIN" | "VENDEDOR";
};

function normalizeVariantIdentityKey(
  color: string,
  colorSecundario: string | undefined,
  talla: string
) {
  return `${color.trim().toLowerCase()}::${(colorSecundario || "")
    .trim()
    .toLowerCase()}::${talla.trim().toLowerCase()}`;
}

export async function reclassifyInventoryVariant(
  input: ReclassifyVariantInput,
  session?: ClientSession
): Promise<{
  producto: ProductoWithVariants;
  varianteOrigen: VariantWithStock;
  varianteDestino: VariantWithStock;
  creadaNuevaVariante: boolean;
  referencia: string;
  movimientoSalida: InventoryMovementRecord;
  movimientoEntrada: InventoryMovementRecord;
}> {
  if (!session) {
    return runInTransaction(async (transactionSession) =>
      reclassifyInventoryVariant(input, transactionSession)
    );
  }

  assertObjectId(input.userIdRaw, "Usuario no autenticado");
  assertObjectId(input.productoId, "ID de producto inválido");
  if (input.sucursalId) {
    assertObjectId(input.sucursalId, "ID de sucursal inválido");
  }

  const qty = Math.floor(Number(input.cantidad));
  if (!Number.isFinite(qty) || qty < 1) {
    throw new AppError("La cantidad debe ser un número entero mayor o igual a 1", 400);
  }

  await connectDB();

  const producto = await Producto.findById(input.productoId).session(session ?? null);
  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const variantesList = producto.variantes as VariantWithStock[];
  const varianteOrigen = resolveVariant(variantesList, {
    varianteId: input.varianteOrigenId,
    color: input.origenColor,
    colorSecundario: input.origenColorSecundario,
    talla: input.origenTalla,
  });

  if (!varianteOrigen.varianteId) {
    varianteOrigen.varianteId = createVariantId();
  }

  const stockGlobalDisponibleOrigen = getAvailableStockForVariant(varianteOrigen);
  if (stockGlobalDisponibleOrigen < qty) {
    throw new AppError(
      `Stock disponible insuficiente en ${varianteOrigen.color} / Talla ${varianteOrigen.talla}. Disponible: ${stockGlobalDisponibleOrigen}`,
      400
    );
  }

  const targetSucursalId = input.sucursalId
    ? new mongoose.Types.ObjectId(input.sucursalId.toString())
    : await getDefaultWarehouseId(session);

  let nivelOrigen = await NivelStock.findOne(
    { sucursalId: targetSucursalId, varianteId: varianteOrigen.varianteId },
    null,
    session ? { session } : undefined
  );

  // Salvaguarda legacy: si no existe ningún NivelStock para esta variante en el sistema, inicializarlo
  if (!nivelOrigen) {
    const totalNivelesOrigen = await NivelStock.countDocuments(
      { varianteId: varianteOrigen.varianteId },
      session ? { session } : undefined
    );

    if (totalNivelesOrigen === 0 && stockGlobalDisponibleOrigen >= qty) {
      const nuevoNivel = new NivelStock({
        sucursalId: targetSucursalId,
        productoId: producto._id,
        varianteId: varianteOrigen.varianteId,
        stockFisico: Math.max(0, Number(varianteOrigen.stock || 0)),
        stockReservado: Math.max(0, Number(varianteOrigen.stockReservado || 0)),
        stockMinimo: 2,
      });
      await nuevoNivel.save(session ? { session } : undefined);
      nivelOrigen = nuevoNivel;
    }
  }

  const stockSucursalDisponibleOrigen = nivelOrigen
    ? Math.max(
        0,
        Number(nivelOrigen.stockFisico || 0) - Number(nivelOrigen.stockReservado || 0)
      )
    : 0;

  if (stockSucursalDisponibleOrigen < qty) {
    const otrosNiveles = await NivelStock.find(
      { varianteId: varianteOrigen.varianteId, stockFisico: { $gt: 0 } },
      null,
      session ? { session } : undefined
    ).populate("sucursalId", "nombre codigo");

    const sucursalDoc = await Sucursal.findById(targetSucursalId)
      .select("nombre")
      .session(session ?? null);
    const nombreSucursal = sucursalDoc?.nombre || "la sucursal seleccionada";

    if (otrosNiveles.length > 0) {
      const disponiblesTexto = otrosNiveles
        .map((n) => {
          const disp = Math.max(
            0,
            Number(n.stockFisico || 0) - Number(n.stockReservado || 0)
          );
          const sNom = (n.sucursalId as { nombre?: string })?.nombre || "Otra sucursal";
          return `${sNom} (${disp} disp.)`;
        })
        .join(", ");

      throw new AppError(
        `Stock insuficiente en ${nombreSucursal} para ${varianteOrigen.color} / Talla ${varianteOrigen.talla}. Disponible aquí: ${stockSucursalDisponibleOrigen}. Hay existencias en: ${disponiblesTexto}.`,
        400
      );
    }

    throw new AppError(
      `Stock insuficiente en ${nombreSucursal} para ${varianteOrigen.color} / Talla ${varianteOrigen.talla}. Disponible: ${stockSucursalDisponibleOrigen}.`,
      400
    );
  }

  const costoOrigen = Number(
    varianteOrigen.precioCosto !== undefined &&
      varianteOrigen.precioCosto !== null &&
      Number(varianteOrigen.precioCosto) > 0
      ? varianteOrigen.precioCosto
      : (producto as unknown as { precioCosto?: number }).precioCosto || 0
  );

  let varianteDestino: VariantWithStock | undefined;
  let creadaNuevaVariante = false;

  if (input.varianteDestinoId) {
    varianteDestino = variantesList.find(
      (v) => v.varianteId === input.varianteDestinoId
    );
    if (!varianteDestino) {
      throw new AppError("Variante destino no encontrada en este producto", 404);
    }
  } else {
    const destinoColor = (input.destinoColor || varianteOrigen.color).trim();
    const mismoColorQueOrigen =
      destinoColor.toLowerCase() === varianteOrigen.color.trim().toLowerCase();
    const destinoColorSecundario =
      input.destinoColorSecundario !== undefined
        ? input.destinoColorSecundario.trim() || undefined
        : mismoColorQueOrigen
          ? varianteOrigen.colorSecundario || undefined
          : undefined;
    const destinoTalla = (input.destinoTalla || "").trim();

    if (!destinoTalla) {
      throw new AppError("Debes indicar la talla destino", 400);
    }

    const destinoKey = normalizeVariantIdentityKey(
      destinoColor,
      destinoColorSecundario,
      destinoTalla
    );

    const existentePorAtributos = variantesList.find(
      (v) =>
        normalizeVariantIdentityKey(v.color, v.colorSecundario, v.talla) ===
        destinoKey
    );

    if (existentePorAtributos) {
      varianteDestino = existentePorAtributos;
    } else {
      const existingCodes = new Set(
        variantesList
          .flatMap((v) => [v.codigoBarra, v.qrCode])
          .filter((c): c is string => Boolean(c))
      );

      let correlativo = 1;
      let generated = generarCodigoVariante({
        sku: producto.sku,
        color: destinoColor,
        colorSecundario: destinoColorSecundario,
        talla: destinoTalla,
        correlativo,
      });

      while (
        existingCodes.has(generated.codigoBarra) ||
        existingCodes.has(generated.qrCode)
      ) {
        correlativo += 1;
        generated = generarCodigoVariante({
          sku: producto.sku,
          color: destinoColor,
          colorSecundario: destinoColorSecundario,
          talla: destinoTalla,
          correlativo,
        });
      }

      const nuevaVarianteData = {
        varianteId: createVariantId(),
        color: destinoColor,
        colorSecundario: destinoColorSecundario,
        talla: destinoTalla,
        stock: 0,
        stockReservado: 0,
        descripcion: varianteOrigen.descripcion,
        imagenes: Array.isArray(varianteOrigen.imagenes)
          ? [...varianteOrigen.imagenes]
          : [],
        codigoBarra: generated.codigoBarra,
        qrCode: generated.qrCode,
        precioVenta: varianteOrigen.precioVenta,
        precioCosto: costoOrigen,
        precioOfertaWeb: varianteOrigen.precioOfertaWeb ?? null,
      };

      producto.variantes.push(nuevaVarianteData);
      varianteDestino = producto.variantes[
        producto.variantes.length - 1
      ] as VariantWithStock;
      creadaNuevaVariante = true;
    }
  }

  if (!varianteDestino.varianteId) {
    varianteDestino.varianteId = createVariantId();
  }

  if (varianteDestino.varianteId === varianteOrigen.varianteId) {
    throw new AppError(
      "La variante destino debe ser diferente a la variante origen",
      400
    );
  }

  const origenStockAnterior = Number(varianteOrigen.stock || 0);
  const origenStockActual = origenStockAnterior - qty;

  const destinoStockAnterior = Number(varianteDestino.stock || 0);
  const destinoStockActual = destinoStockAnterior + qty;

  const costoDestinoAnterior = Number(
    varianteDestino.precioCosto !== undefined &&
      varianteDestino.precioCosto !== null &&
      Number(varianteDestino.precioCosto) > 0
      ? varianteDestino.precioCosto
      : 0
  );

  // Recalcular Costo Promedio Ponderado (CPP) en la variante destino al recibir las prendas reclasificadas
  const nuevoCostoDestino =
    destinoStockAnterior <= 0 || costoDestinoAnterior <= 0
      ? costoOrigen
      : Number(
          (
            (destinoStockAnterior * costoDestinoAnterior + qty * costoOrigen) /
            destinoStockActual
          ).toFixed(2)
        );

  varianteOrigen.stock = origenStockActual;
  varianteDestino.stock = destinoStockActual;
  if (nuevoCostoDestino > 0) {
    varianteDestino.precioCosto = nuevoCostoDestino;
  }

  await producto.save(session ? { session } : undefined);

  // Actualizar NivelStock en la sucursal de forma atómica
  await NivelStock.findOneAndUpdate(
    { sucursalId: targetSucursalId, varianteId: varianteOrigen.varianteId },
    { $inc: { stockFisico: -qty } },
    { session: session ?? undefined }
  );

  await NivelStock.findOneAndUpdate(
    { sucursalId: targetSucursalId, varianteId: varianteDestino.varianteId },
    {
      $inc: { stockFisico: qty },
      $setOnInsert: {
        productoId: producto._id,
        stockReservado: 0,
        stockMinimo: 2,
      },
    },
    { upsert: true, session: session ?? undefined }
  );

  const referenciaFinal =
    input.referencia?.trim() ||
    `RECLASIF-${Date.now().toString(36).toUpperCase()}`;

  const etiquetaOrigen = `${varianteOrigen.color}${
    varianteOrigen.colorSecundario ? `/${varianteOrigen.colorSecundario}` : ""
  } T.${varianteOrigen.talla}`;
  const etiquetaDestino = `${varianteDestino.color}${
    varianteDestino.colorSecundario ? `/${varianteDestino.colorSecundario}` : ""
  } T.${varianteDestino.talla}`;

  const motivoBase = input.motivo?.trim();
  const motivoSalida = motivoBase
    ? `Reclasificación hacia ${etiquetaDestino} — ${motivoBase}`
    : `Reclasificación de variante: ${etiquetaOrigen} → ${etiquetaDestino}`;
  const motivoEntrada = motivoBase
    ? `Reclasificación desde ${etiquetaOrigen} — ${motivoBase}`
    : `Reclasificación de variante: ${etiquetaOrigen} → ${etiquetaDestino}`;

  const valorOperacion = Number((qty * costoOrigen).toFixed(2));
  const saldoValoradoOrigen = Number((origenStockActual * costoOrigen).toFixed(2));
  const saldoValoradoDestino = Number(
    (destinoStockActual * nuevoCostoDestino).toFixed(2)
  );
  const actorObjectId = new mongoose.Types.ObjectId(input.userIdRaw);

  const movimientoSalida = await recordInventoryMovement(
    {
      producto,
      variante: varianteOrigen,
      sucursalId: targetSucursalId,
      tipo: "SALIDA",
      cantidad: qty,
      stockAnterior: origenStockAnterior,
      stockActual: origenStockActual,
      motivo: motivoSalida,
      referencia: referenciaFinal,
      userId: actorObjectId,
      costoUnitario: costoOrigen,
      valorTotalOperacion: valorOperacion,
      costoPromedioResultante: costoOrigen,
      saldoValorado: saldoValoradoOrigen,
    },
    session
  );

  const movimientoEntrada = await recordInventoryMovement(
    {
      producto,
      variante: varianteDestino,
      sucursalId: targetSucursalId,
      tipo: "ENTRADA",
      cantidad: qty,
      stockAnterior: destinoStockAnterior,
      stockActual: destinoStockActual,
      motivo: motivoEntrada,
      referencia: referenciaFinal,
      userId: actorObjectId,
      costoUnitario: costoOrigen,
      valorTotalOperacion: valorOperacion,
      costoPromedioResultante: nuevoCostoDestino,
      saldoValorado: saldoValoradoDestino,
    },
    session
  );

  await recordAuditEventSafe(
    {
      accion: "INVENTORY_VARIANT_RECLASSIFIED",
      tipoEntidad: "INVENTORY_MOVEMENT",
      idEntidad: movimientoEntrada._id.toString(),
      idActor: input.userIdRaw,
      rolActor: input.rolActor,
      estado: "SUCCESS",
      metadata: {
        productoId: input.productoId,
        sucursalId: targetSucursalId.toString(),
        cantidad: qty,
        referencia: referenciaFinal,
        creadaNuevaVariante,
        origen: {
          varianteId: varianteOrigen.varianteId,
          color: varianteOrigen.color,
          talla: varianteOrigen.talla,
          stockAnterior: origenStockAnterior,
          stockActual: origenStockActual,
        },
        destino: {
          varianteId: varianteDestino.varianteId,
          color: varianteDestino.color,
          talla: varianteDestino.talla,
          stockAnterior: destinoStockAnterior,
          stockActual: destinoStockActual,
          costoPromedioResultante: nuevoCostoDestino,
        },
      },
    },
    session
  );

  return {
    producto,
    varianteOrigen,
    varianteDestino,
    creadaNuevaVariante,
    referencia: referenciaFinal,
    movimientoSalida,
    movimientoEntrada,
  };
}
