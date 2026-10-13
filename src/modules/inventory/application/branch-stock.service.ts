import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import NivelStock from "@/models/nivelStock";
import Producto from "@/models/producto";
import Sucursal from "@/models/sucursal";
import { AppError } from "@/shared/errors/AppError";
import type { NivelStockConDetalles } from "@/types/nivelStock";

/**
 * Obtiene el almacén principal por defecto (o el primero activo si no hay principal marcado)
 */
export async function getDefaultWarehouseId(session?: ClientSession): Promise<mongoose.Types.ObjectId> {
  await connectDB();
  const sucursal = await Sucursal.findOne(
    { $or: [{ esAlmacenPrincipal: true }, { tipo: "ALMACEN_CENTRAL" }], activa: true },
    null,
    session ? { session } : undefined
  );

  if (sucursal) {
    return sucursal._id as mongoose.Types.ObjectId;
  }

  const anyActive = await Sucursal.findOne({ activa: true }, null, session ? { session } : undefined);
  if (!anyActive) {
    throw new AppError("No hay ninguna sucursal activa configurada en el sistema", 500);
  }

  return anyActive._id as mongoose.Types.ObjectId;
}

/**
 * Obtiene el stock disponible (stockFisico - stockReservado) de una variante en una sucursal específica.
 */
export async function getAvailableStockInBranch(
  sucursalId: string | mongoose.Types.ObjectId,
  varianteId: string,
  session?: ClientSession
): Promise<number> {
  await connectDB();
  const nivel = await NivelStock.findOne(
    { sucursalId, varianteId },
    null,
    session ? { session } : undefined
  );

  if (!nivel) return 0;
  return Math.max(0, Number(nivel.stockFisico || 0) - Number(nivel.stockReservado || 0));
}

/**
 * Obtiene los niveles de stock desglosados por sucursal para un producto completo.
 */
export async function getStockLevelsByProduct(
  productoId: string
): Promise<NivelStockConDetalles[]> {
  await connectDB();
  return (await NivelStock.find({ productoId })
    .populate("sucursalId", "nombre codigo tipo permiteVentaPOS activa")
    .lean()) as unknown as NivelStockConDetalles[];
}

/**
 * Reserva stock de forma atómica en una sucursal específica para pedidos en checkout/confirmación.
 */
export async function reserveStockInBranch({
  sucursalId,
  productoId,
  varianteId,
  cantidad,
}: {
  sucursalId: string | mongoose.Types.ObjectId;
  productoId: string | mongoose.Types.ObjectId;
  varianteId: string;
  cantidad: number;
}, session?: ClientSession) {
  if (cantidad <= 0) return;
  await connectDB();

  // Actualización atómica con condición: stockFisico - stockReservado >= cantidad
  const updated = await NivelStock.findOneAndUpdate(
    {
      sucursalId,
      varianteId,
      $expr: {
        $gte: [{ $subtract: ["$stockFisico", "$stockReservado"] }, cantidad],
      },
    },
    {
      $inc: { stockReservado: cantidad },
    },
    {
      new: true,
      session: session ?? undefined,
    }
  );

  if (!updated) {
    throw new AppError("Stock insuficiente en la sucursal seleccionada", 400);
  }

  // Sincronizar stockReservado en el documento padre Producto
  await Producto.updateOne(
    { _id: productoId, "variantes.varianteId": varianteId },
    { $inc: { "variantes.$.stockReservado": cantidad } },
    session ? { session } : undefined
  );

  return updated;
}

/**
 * Libera stock reservado en una sucursal (ej. cancelación de pedido o expiración de cron).
 */
export async function releaseReservedStockInBranch({
  sucursalId,
  productoId,
  varianteId,
  cantidad,
}: {
  sucursalId: string | mongoose.Types.ObjectId;
  productoId: string | mongoose.Types.ObjectId;
  varianteId: string;
  cantidad: number;
}, session?: ClientSession) {
  if (cantidad <= 0) return;
  await connectDB();

  const updated = await NivelStock.findOneAndUpdate(
    { sucursalId, varianteId },
    {
      $inc: { stockReservado: -cantidad },
    },
    {
      new: true,
      session: session ?? undefined,
    }
  );

  if (updated && updated.stockReservado < 0) {
    updated.stockReservado = 0;
    await updated.save(session ? { session } : undefined);
  }

  // Sincronizar en Producto
  await Producto.updateOne(
    { _id: productoId, "variantes.varianteId": varianteId },
    { $inc: { "variantes.$.stockReservado": -cantidad } },
    session ? { session } : undefined
  );

  return updated;
}

/**
 * Consume stock reservado al concretar venta o pago confirmado.
 */
export async function consumeStockInBranch({
  sucursalId,
  productoId,
  varianteId,
  cantidad,
}: {
  sucursalId: string | mongoose.Types.ObjectId;
  productoId: string | mongoose.Types.ObjectId;
  varianteId: string;
  cantidad: number;
}, session?: ClientSession) {
  if (cantidad <= 0) return;
  await connectDB();

  const updated = await NivelStock.findOneAndUpdate(
    {
      sucursalId,
      varianteId,
      stockFisico: { $gte: cantidad },
    },
    {
      $inc: {
        stockFisico: -cantidad,
        stockReservado: -cantidad,
      },
    },
    {
      new: true,
      session: session ?? undefined,
    }
  );

  if (!updated) {
    throw new AppError("No se pudo consumir el stock: existencias insuficientes en la sucursal", 400);
  }

  if (updated.stockReservado < 0) {
    updated.stockReservado = 0;
    await updated.save(session ? { session } : undefined);
  }

  // Sincronizar stock total en Producto
  await Producto.updateOne(
    { _id: productoId, "variantes.varianteId": varianteId },
    {
      $inc: {
        "variantes.$.stock": -cantidad,
        "variantes.$.stockReservado": -cantidad,
        totalVendidos: cantidad,
      },
    },
    session ? { session } : undefined
  );

  return updated;
}

/**
 * Incrementa stock en una sucursal (ej: reabastecimiento, traspaso entrante, compra).
 */
export async function increaseStockInBranch({
  sucursalId,
  productoId,
  varianteId,
  cantidad,
}: {
  sucursalId: string | mongoose.Types.ObjectId;
  productoId: string | mongoose.Types.ObjectId;
  varianteId: string;
  cantidad: number;
}, session?: ClientSession) {
  if (cantidad <= 0) return;
  await connectDB();

  const updated = await NivelStock.findOneAndUpdate(
    { sucursalId, varianteId },
    {
      $inc: { stockFisico: cantidad },
      $setOnInsert: { productoId, stockReservado: 0, stockMinimo: 2 },
    },
    {
      new: true,
      upsert: true,
      session: session ?? undefined,
    }
  );

  // Sincronizar stock global en Producto
  await Producto.updateOne(
    { _id: productoId, "variantes.varianteId": varianteId },
    { $inc: { "variantes.$.stock": cantidad } },
    session ? { session } : undefined
  );

  return updated;
}

/**
 * Decrementa stock físico en una sucursal (ej: anulación de compra o merma).
 */
export async function decreaseStockInBranch({
  sucursalId,
  productoId,
  varianteId,
  cantidad,
}: {
  sucursalId: string | mongoose.Types.ObjectId;
  productoId: string | mongoose.Types.ObjectId;
  varianteId: string;
  cantidad: number;
}, session?: ClientSession) {
  if (cantidad <= 0) return;
  await connectDB();

  const updated = await NivelStock.findOneAndUpdate(
    { sucursalId, varianteId, stockFisico: { $gte: cantidad } },
    {
      $inc: { stockFisico: -cantidad },
    },
    {
      new: true,
      session: session ?? undefined,
    }
  );

  if (!updated) {
    throw new AppError("No hay suficiente stock físico en la sucursal para realizar la deducción", 400);
  }

  // Sincronizar stock global en Producto
  await Producto.updateOne(
    { _id: productoId, "variantes.varianteId": varianteId },
    { $inc: { "variantes.$.stock": -cantidad } },
    session ? { session } : undefined
  );

  return updated;
}
