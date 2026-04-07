import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";
import Producto from "@/models/product";
import type { Variante } from "@/types/producto";
import type { CreateVentaInput } from "@/schemas/venta.schema";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import { findVariantByIdentity } from "@/utils/variantIdentity";
import { consumeStockForSale } from "@/modules/inventory/application/inventory.service";
import { createOrderFromSale } from "@/modules/orders/application/orders.service";
import { createImmediatePaidPaymentForOrder } from "@/modules/payments/application/payments.service";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { AppError } from "@/shared/errors/AppError";
import { runInTransaction } from "@/shared/db/runTransaction";

export type SalesActor = {
  id: string;
  role: "ADMIN" | "VENDEDOR" | "CLIENTE";
};

type VentaItemProcesado = {
  productoId: string;
  variante: {
    variantId?: string;
    color: string;
    talla: string;
    codigoBarra?: string;
    qrCode?: string;
  };
  productoSnapshot: {
    nombre: string;
    modelo: string;
    sku: string;
    imagen?: string;
  };
  cantidad: number;
  precioUnitario: number;
  precioCosto: number;
  ganancia: number;
};

export async function createDirectSale(
  actor: SalesActor,
  input: CreateVentaInput
) {
  const userId = actor.id;
  const role = actor.role;

  if (!["ADMIN", "VENDEDOR", "CLIENTE"].includes(role)) {
    throw new AppError("No autorizado para realizar ventas", 403);
  }

  if (role === "CLIENTE" && input.tipoVenta !== "WEB") {
    throw new AppError("CLIENTE solo puede registrar ventas tipo WEB", 403);
  }

  const { items, metodoPago, tipoVenta, descuento = 0, delivery } = input;
  const impuesto = 0;

  return runInTransaction(async (session) => {
    let subtotal = 0;
    let gananciaTotal = 0;
    const itemsProcesados: VentaItemProcesado[] = [];

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.productoId)) {
        throw new AppError("ID de producto invalido", 400);
      }

      const producto = await Producto.findById(item.productoId).session(
        session
      );

      if (!producto) {
        throw new AppError("Producto no encontrado", 404);
      }

      const variante = findVariantByIdentity(producto.variantes as Variante[], {
        variantId: item.variantId,
        color: item.color,
        talla: item.talla,
      });

      if (!variante) {
        throw new AppError("Variante no encontrada", 404);
      }

      const precioUnitario = producto.precioVenta;
      const precioCosto = producto.precioCosto;

      subtotal += precioUnitario * item.cantidad;
      gananciaTotal += (precioUnitario - precioCosto) * item.cantidad;

      await consumeStockForSale(
        {
          producto,
          variante,
          cantidad: item.cantidad,
          userId,
        },
        session
      );

      itemsProcesados.push({
        productoId: item.productoId,
        variante: {
          variantId: variante.variantId,
          color: variante.color,
          talla: variante.talla,
          codigoBarra: variante.codigoBarra,
          qrCode: variante.qrCode,
        },
        productoSnapshot: {
          nombre: producto.nombre,
          modelo: producto.modelo,
          sku: producto.sku,
          imagen: getVarianteImagenPrincipal(variante),
        },
        cantidad: item.cantidad,
        precioUnitario,
        precioCosto,
        ganancia: (precioUnitario - precioCosto) * item.cantidad,
      });
    }

    const total = subtotal - descuento + impuesto;
    const numeroVenta = `V-${Date.now()}`;
    const ventaPayload: Record<string, unknown> = {
      numeroVenta,
      items: itemsProcesados,
      subtotal,
      descuento,
      impuesto,
      total,
      gananciaTotal,
      metodoPago,
      tipoVenta,
      estado: "PAGADA",
    };

    if (delivery) {
      ventaPayload.delivery = delivery;
    }

    if (role === "CLIENTE") {
      ventaPayload.cliente = userId;
    } else {
      ventaPayload.vendedor = userId;
    }

    const venta = await Venta.create([ventaPayload], { session }).then(
      ([createdVenta]) => createdVenta
    );

    const order = await createOrderFromSale(
      {
        saleId: venta._id.toString(),
        saleNumber: venta.numeroVenta,
        items: itemsProcesados.map((item) => ({
          productoId: item.productoId,
          variante: item.variante,
          productoSnapshot: item.productoSnapshot,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
        })),
        subtotal,
        descuento,
        total,
        metodoPago,
        channel: tipoVenta,
        saleStatus: "PAGADA",
        customerId: role === "CLIENTE" ? userId : undefined,
        sellerId: role !== "CLIENTE" ? userId : undefined,
        delivery,
      },
      { session }
    );

    const payment = await createImmediatePaidPaymentForOrder(
      {
        orderId: order._id.toString(),
        customerId: role === "CLIENTE" ? userId : null,
        metodoPago,
        amount: total,
        externalReference: venta.numeroVenta,
      },
      session
    );

    await recordAuditEventSafe(
      {
        action: "SALE_CREATED",
        entityType: "SALE",
        entityId: venta._id.toString(),
        actorId: userId,
        actorRole: role,
        status: "SUCCESS",
        metadata: {
          orderId: order._id.toString(),
          paymentId: payment._id.toString(),
          total,
          tipoVenta,
          metodoPago,
          items: itemsProcesados.length,
        },
      },
      session
    );

    return { venta, order };
  });
}

export async function listSales() {
  await connectDB();
  return Venta.find().populate("vendedor", "fullname email").sort({ createdAt: -1 });
}

export async function getSaleById(id: string) {
  await connectDB();

  const venta = await Venta.findById(id).populate("vendedor", "fullname email");

  if (!venta) {
    throw new AppError("Venta no encontrada", 404);
  }

  return venta;
}
