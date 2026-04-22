import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";
import type { Variante } from "@/types/producto";
import { findVariantByIdentity } from "@/utils/variantIdentity";
import { AppError } from "@/shared/errors/AppError";
import { inventoryRepository } from "@/modules/inventory/infrastructure/inventory.repository";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import {
  getVariantAvailableStock,
  getVariantReservedStock,
} from "@/modules/catalog/domain/variant.utils";
import { runInTransaction } from "@/shared/db/runTransaction";

type VariantLookup = {
  variantId?: string;
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
  reservedStock?: number;
};

type RecordInventoryMovementInput = {
  producto: ProductoWithVariants;
  variante: VariantWithStock;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE" | "DEVOLUCION";
  cantidad: number;
  stockAnterior: number;
  stockActual: number;
  motivo?: string;
  referencia?: string;
  userId: string | mongoose.Types.ObjectId;
};

type AdjustInventoryInput = VariantLookup & {
  productoId: string;
  cantidad: number;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE" | "DEVOLUCION";
  motivo?: string;
  referencia?: string;
  userIdRaw: string;
};

type ConsumeStockForSaleInput = {
  producto: ProductoWithVariants & { totalVendidos: number };
  variante: VariantWithStock;
  cantidad: number;
  userId: string;
  referencia?: string;
  motivo?: string;
};

type InventoryMovementRecord = Awaited<
  ReturnType<typeof inventoryRepository.create>
>;

type AdjustInventoryResult = {
  producto: ProductoWithVariants;
  variante: VariantWithStock;
  movimiento: InventoryMovementRecord;
};

function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

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
}: RecordInventoryMovementInput, session?: ClientSession) {
  const validUserId = mongoose.Types.ObjectId.isValid(userId.toString()) 
    ? userId 
    : undefined;

  return inventoryRepository.create({
    productoId: producto._id,
    productoSnapshot: {
      nombre: producto.nombre,
      modelo: producto.modelo,
      sku: producto.sku,
    },
    variante: {
      variantId: variante.variantId,
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
    usuario: validUserId as any,
  }, session);
}

export function getAvailableStockForVariant(variante: VariantWithStock) {
  return getVariantAvailableStock(variante);
}

export async function reserveStockForOrder({
  producto,
  variante,
  cantidad,
}: {
  producto: ProductoWithVariants;
  variante: VariantWithStock;
  cantidad: number;
}, session?: ClientSession) {
  if (getAvailableStockForVariant(variante) < cantidad) {
    throw new AppError(`Stock insuficiente (${producto.nombre})`, 400);
  }

  variante.reservedStock = getVariantReservedStock(variante) + cantidad;
  await producto.save(session ? { session } : undefined);

  return {
    reservedStock: variante.reservedStock,
    availableStock: getAvailableStockForVariant(variante),
  };
}

export async function releaseReservedStockForOrder({
  producto,
  variante,
  cantidad,
}: {
  producto: ProductoWithVariants;
  variante: VariantWithStock;
  cantidad: number;
}, session?: ClientSession) {
  variante.reservedStock = Math.max(
    0,
    getVariantReservedStock(variante) - cantidad
  );
  await producto.save(session ? { session } : undefined);

  return {
    reservedStock: variante.reservedStock,
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
}: ConsumeStockForSaleInput, session?: ClientSession) {
  const reservedStock = getVariantReservedStock(variante);

  if (reservedStock < cantidad) {
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
  variante.reservedStock = reservedStock - cantidad;
  producto.totalVendidos += cantidad;
  await producto.save(session ? { session } : undefined);

  const movimiento = await recordInventoryMovement({
    producto,
    variante,
    tipo: "SALIDA",
    cantidad,
    stockAnterior,
    stockActual,
    motivo,
    referencia,
    userId,
  }, session);

  return {
    stockAnterior,
    stockActual,
    reservedStock: variante.reservedStock,
    availableStock: getAvailableStockForVariant(variante),
    movimiento,
  };
}

export async function adjustInventoryStock({
  productoId,
  variantId,
  color,
  colorSecundario,
  talla,
  cantidad,
  tipo,
  motivo,
  referencia = "AJUSTE_MANUAL",
  userIdRaw,
}: AdjustInventoryInput, session?: ClientSession): Promise<AdjustInventoryResult> {
  if (!session) {
    return runInTransaction(async (transactionSession) =>
      adjustInventoryStock(
        {
          productoId,
          variantId,
          color,
          colorSecundario,
          talla,
          cantidad,
          tipo,
          motivo,
          referencia,
          userIdRaw,
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
    variantId,
    color,
    colorSecundario,
    talla,
  });

  const qty = Math.abs(cantidad);
  const stockAnterior = variante.stock;
  let stockActual = stockAnterior;
  const reservedStock = getVariantReservedStock(variante);

  if (tipo === "ENTRADA") {
    stockActual += qty;
  } else if (tipo === "SALIDA") {
    if (getAvailableStockForVariant(variante) < qty) {
      throw new AppError("Stock insuficiente para salida", 400);
    }
    stockActual -= qty;
  } else if (tipo === "AJUSTE") {
    if (qty < reservedStock) {
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

  const movimiento = await recordInventoryMovement({
    producto,
    variante,
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
      action: "INVENTORY_ADJUSTED",
      entityType: "INVENTORY_MOVEMENT",
      entityId: movimiento._id.toString(),
      actorId: userIdRaw,
      actorRole: "ADMIN",
      status: "SUCCESS",
      metadata: {
        productoId,
        variantId: variante.variantId || null,
        tipo,
        cantidad: qty,
        stockAnterior,
        stockActual,
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
}: ConsumeStockForSaleInput, session?: ClientSession) {
  if (getAvailableStockForVariant(variante) < cantidad) {
    throw new AppError(`Stock insuficiente (${producto.nombre})`, 400);
  }

  const stockAnterior = variante.stock;
  const stockActual = stockAnterior - cantidad;

  variante.stock = stockActual;
  producto.totalVendidos += cantidad;
  await producto.save(session ? { session } : undefined);

  const movimiento = await recordInventoryMovement({
    producto,
    variante,
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
