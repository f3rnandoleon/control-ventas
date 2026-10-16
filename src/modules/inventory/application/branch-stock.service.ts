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
 * Obtiene los IDs de las sucursales activas autorizadas para despacho web (permiteDespachoWeb = true).
 * Si ninguna sucursal tiene la marca activada, recurre al almacén principal como salvaguarda.
 */
export async function getWebEligibleBranchIds(
  session?: ClientSession
): Promise<mongoose.Types.ObjectId[]> {
  await connectDB();
  const branches = await Sucursal.find(
    { activa: true, permiteDespachoWeb: true },
    { _id: 1 },
    session ? { session } : undefined
  ).lean();

  if (branches.length > 0) {
    return branches.map((b) => b._id as mongoose.Types.ObjectId);
  }

  const defaultWarehouseId = await getDefaultWarehouseId(session);
  return [defaultWarehouseId];
}

/**
 * Obtiene la sucursal de despacho web por defecto para reservas y salidas de órdenes web/WhatsApp.
 * Prioriza: 1) Activa + permiteDespachoWeb + esAlmacenPrincipal, 2) Cualquier Activa + permiteDespachoWeb, 3) getDefaultWarehouseId
 */
export async function getWebDispatchBranchId(
  session?: ClientSession
): Promise<mongoose.Types.ObjectId> {
  await connectDB();
  const primaryWebBranch = await Sucursal.findOne(
    { activa: true, permiteDespachoWeb: true, esAlmacenPrincipal: true },
    { _id: 1 },
    session ? { session } : undefined
  );

  if (primaryWebBranch) {
    return primaryWebBranch._id as mongoose.Types.ObjectId;
  }

  const anyWebBranch = await Sucursal.findOne(
    { activa: true, permiteDespachoWeb: true },
    { _id: 1 },
    session ? { session } : undefined
  );

  if (anyWebBranch) {
    return anyWebBranch._id as mongoose.Types.ObjectId;
  }

  return getDefaultWarehouseId(session);
}

export interface WebVariantStock {
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
}

/**
 * Obtiene el mapa de existencias consolidadas únicamente entre sucursales autorizadas para despacho web.
 * Devuelve un Map con estructura: Map<productoId, Map<varianteId, WebVariantStock>>
 */
export async function getWebStockMapForProducts(
  productoIds: (string | mongoose.Types.ObjectId)[],
  session?: ClientSession
): Promise<Map<string, Map<string, WebVariantStock>>> {
  await connectDB();
  const branchIds = await getWebEligibleBranchIds(session);

  const niveles = await NivelStock.find(
    {
      productoId: { $in: productoIds },
      sucursalId: { $in: branchIds },
    },
    null,
    session ? { session } : undefined
  ).lean();

  const productMap = new Map<string, Map<string, WebVariantStock>>();

  // Identificar qué productos tienen control de NivelStock en la base de datos
  const trackedProductIds = await NivelStock.find(
    { productoId: { $in: productoIds } },
    { productoId: 1 },
    session ? { session } : undefined
  ).distinct("productoId");

  for (const trackedId of trackedProductIds) {
    productMap.set(trackedId.toString(), new Map<string, WebVariantStock>());
  }

  for (const nivel of niveles) {
    const prodKey = nivel.productoId.toString();
    const varKey = nivel.varianteId.toString();

    if (!productMap.has(prodKey)) {
      productMap.set(prodKey, new Map<string, WebVariantStock>());
    }

    const varMap = productMap.get(prodKey)!;
    const current = varMap.get(varKey) || { stockFisico: 0, stockReservado: 0, stockDisponible: 0 };

    const fisico = Number(nivel.stockFisico || 0);
    const reservado = Number(nivel.stockReservado || 0);
    const disponible = Math.max(0, fisico - reservado);

    varMap.set(varKey, {
      stockFisico: current.stockFisico + fisico,
      stockReservado: current.stockReservado + reservado,
      stockDisponible: current.stockDisponible + disponible,
    });
  }

  return productMap;
}


/**
 * Obtiene el stock disponible para tienda web (stockFisico - stockReservado) de una variante
 * sumando las existencias de todas las sucursales autorizadas para despacho web.
 */
export async function getAvailableWebStockForVariant(
  productoId: string | mongoose.Types.ObjectId,
  varianteId: string,
  session?: ClientSession
): Promise<number> {
  const stockMap = await getWebStockMapForProducts([productoId], session);
  const prodMap = stockMap.get(productoId.toString());
  if (!prodMap) return 0;
  const varStock = prodMap.get(varianteId);
  return varStock ? varStock.stockDisponible : 0;
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
