import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Order from "@/models/order";
import Producto from "@/models/product";
import Venta from "@/models/venta";
import {
  consumeReservedStockForOrder,
  recordInventoryMovement,
  releaseReservedStockForOrder,
} from "@/modules/inventory/application/inventory.service";
import { syncFulfillmentForOrder } from "@/modules/fulfillment/application/fulfillment.service";
import { releaseExpiredReservations } from "@/modules/orders/application/orders.service";
import { paymentsRepository } from "@/modules/payments/infrastructure/payments.repository";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { findVariantByIdentity } from "@/utils/variantIdentity";
import type {
  ConfirmPaymentInput,
  CreatePaymentTransactionInput,
  FailPaymentInput,
  RefundPaymentInput,
} from "@/schemas/payment.schema";
import type { Variante } from "@/types/producto";
import { AppError } from "@/shared/errors/AppError";
import { runInTransaction } from "@/shared/db/runTransaction";

type AuthActor = {
  id: string;
  role: "ADMIN" | "VENDEDOR" | "CLIENTE";
};

function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

function createPaymentNumber() {
  return `P-${Date.now()}`;
}

function createDirectSalePaymentIdempotencyKey(orderId: string) {
  return `direct-sale-payment-${orderId}`;
}

export async function createImmediatePaidPaymentForOrder(
  input: {
    orderId: string;
    customerId?: string | null;
    metodoPago: "EFECTIVO" | "QR";
    amount: number;
    externalReference?: string | null;
  },
  session?: mongoose.ClientSession
) {
  const existingPayment = await paymentsRepository.findLatestPaidByOrder(
    input.orderId,
    session
  );

  if (existingPayment) {
    return existingPayment;
  }

  return paymentsRepository.create(
    {
      paymentNumber: createPaymentNumber(),
      orderId: input.orderId,
      customer: input.customerId || null,
      metodoPago: input.metodoPago,
      amount: input.amount,
      status: "PAID",
      idempotencyKey: createDirectSalePaymentIdempotencyKey(input.orderId),
      externalReference: input.externalReference || null,
      confirmedAt: new Date(),
      failedAt: null,
      refundedAt: null,
      failureReason: null,
    },
    session
  );
}

async function getOrderForPayment(
  orderId: string,
  session?: mongoose.ClientSession
) {
  const order = await Order.findById(orderId).session(session ?? null);

  if (!order) {
    throw new AppError("Pedido no encontrado", 404);
  }

  return order;
}

function assertOrderAccess(actor: AuthActor, order: { customer?: mongoose.Types.ObjectId | null }) {
  if (
    actor.role === "CLIENTE" &&
    order.customer?.toString() !== actor.id
  ) {
    throw new AppError("No autorizado", 403);
  }
}

async function createSaleFromOrderIfNeeded(
  order: InstanceType<typeof Order>,
  actor: AuthActor,
  session?: mongoose.ClientSession
) {
  if (order.sourceSaleId) {
    return Venta.findById(order.sourceSaleId).session(session ?? null);
  }

  let subtotal = 0;
  let gananciaTotal = 0;
  const itemsProcesados: Array<Record<string, unknown>> = [];

  for (const item of order.items) {
    const producto = await Producto.findById(item.productoId).session(
      session ?? null
    );

    if (!producto) {
      throw new AppError("Producto no encontrado durante confirmacion de pago", 404);
    }

    const variante = findVariantByIdentity(producto.variantes as Variante[], {
      variantId: item.variante.variantId,
      color: item.variante.color,
      talla: item.variante.talla,
    });

    if (!variante) {
      throw new AppError("Variante no encontrada durante confirmacion de pago", 404);
    }

    await consumeReservedStockForOrder(
      {
        producto,
        variante,
        cantidad: item.cantidad,
        userId: actor.id,
        motivo: "Venta web confirmada",
        referencia: "ORDER_PAYMENT_CONFIRM",
      },
      session
    );

    subtotal += item.precioUnitario * item.cantidad;
    gananciaTotal += (item.precioUnitario - producto.precioCosto) * item.cantidad;

    itemsProcesados.push({
      productoId: item.productoId,
      variante: item.variante,
      productoSnapshot: item.productoSnapshot,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      precioCosto: producto.precioCosto,
      ganancia: (item.precioUnitario - producto.precioCosto) * item.cantidad,
    });
  }

  const venta = await Venta.create(
    [
      {
        numeroVenta: `V-${Date.now()}`,
        items: itemsProcesados,
        subtotal,
        descuento: order.descuento,
        total: order.total,
        gananciaTotal,
        metodoPago: order.metodoPago,
        tipoVenta: order.channel,
        estado: "PAGADA",
        cliente: order.customer || null,
        vendedor: order.seller || null,
        delivery: order.deliverySnapshot || undefined,
      },
    ],
    session ? { session } : {}
  ).then(([createdVenta]) => createdVenta);

  order.sourceSaleId = venta._id;
  order.sourceSaleNumber = venta.numeroVenta;
  order.stockReservationStatus = "CONSUMED";
  order.reservedAt = null;
  order.reservationExpiresAt = null;
  await order.save(session ? { session } : undefined);

  return venta;
}

export async function createPaymentTransaction(
  actor: AuthActor,
  input: CreatePaymentTransactionInput
) {
  assertObjectId(input.orderId, "Pedido invalido");
  await connectDB();
  await releaseExpiredReservations();

  return runInTransaction(async (session) => {
    if (input.idempotencyKey) {
      const existingPayment = await paymentsRepository.findByIdempotencyKey(
        input.idempotencyKey,
        session
      );

      if (existingPayment) {
        return existingPayment;
      }
    }

    const order = await getOrderForPayment(input.orderId, session);
    assertOrderAccess(actor, order);

    if (
      order.stockReservationStatus === "RELEASED" &&
      order.paymentStatus !== "PAID"
    ) {
      throw new AppError(
        "La reserva de stock de este pedido ya no esta activa",
        409
      );
    }

    const paidPayment = await paymentsRepository.findLatestPaidByOrder(
      input.orderId,
      session
    );

    if (paidPayment) {
      throw new AppError("Este pedido ya tiene un pago confirmado", 409);
    }

    const paymentPayload: Record<string, unknown> = {
      paymentNumber: createPaymentNumber(),
      orderId: order._id,
      customer: order.customer || null,
      metodoPago: input.metodoPago,
      amount: order.total,
      status: "PENDING",
      externalReference: input.externalReference || null,
    };

    if (input.idempotencyKey) {
      paymentPayload.idempotencyKey = input.idempotencyKey;
    }

    const payment = await paymentsRepository.create(paymentPayload, session);

    await recordAuditEventSafe(
      {
        action: "PAYMENT_CREATED",
        entityType: "PAYMENT",
        entityId: payment._id.toString(),
        actorId: actor.id,
        actorRole: actor.role,
        status: "SUCCESS",
        metadata: {
          orderId: order._id.toString(),
          amount: payment.amount,
          metodoPago: payment.metodoPago,
        },
      },
      session
    );

    return payment;
  });
}

export async function confirmPaymentTransaction(
  actor: AuthActor,
  paymentId: string,
  input: ConfirmPaymentInput
) {
  assertObjectId(paymentId, "Pago invalido");
  await connectDB();
  await releaseExpiredReservations();

  return runInTransaction(async (session) => {
    const payment = await paymentsRepository.findById(paymentId, session);

    if (!payment) {
      throw new AppError("Pago no encontrado", 404);
    }

    const order = await getOrderForPayment(payment.orderId.toString(), session);
    assertOrderAccess(actor, order);

    if (
      order.orderStatus === "CANCELLED" &&
      order.stockReservationStatus === "RELEASED"
    ) {
      throw new AppError("La reserva de stock de este pedido ya expiro", 409);
    }

    if (payment.status === "REFUNDED") {
      throw new AppError("El pago ya fue reembolsado", 400);
    }

    const venta = await createSaleFromOrderIfNeeded(order, actor, session);

    if (payment.status !== "PAID") {
      payment.status = "PAID";
      payment.confirmedAt = new Date();
      payment.failedAt = null;
      payment.failureReason = null;
      if (input.externalReference) {
        payment.externalReference = input.externalReference;
      }
      await payment.save({ session });
    }

    order.paymentStatus = "PAID";
    order.orderStatus = "CONFIRMED";
    order.stockReservationStatus = "CONSUMED";
    order.reservedAt = null;
    order.reservationExpiresAt = null;
    if (order.fulfillmentStatus === "CANCELLED") {
      order.fulfillmentStatus = order.deliverySnapshot?.method
        ? "PENDING"
        : "NOT_APPLICABLE";
    }
    await order.save({ session });
    await syncFulfillmentForOrder(order, session);

    await recordAuditEventSafe(
      {
        action: "PAYMENT_CONFIRMED",
        entityType: "PAYMENT",
        entityId: payment._id.toString(),
        actorId: actor.id,
        actorRole: actor.role,
        status: "SUCCESS",
        metadata: {
          orderId: order._id.toString(),
          saleId: venta?._id?.toString() || null,
        },
      },
      session
    );

    return { payment, order, venta };
  });
}

export async function failPaymentTransaction(
  actor: AuthActor,
  paymentId: string,
  input: FailPaymentInput
) {
  assertObjectId(paymentId, "Pago invalido");
  await connectDB();
  await releaseExpiredReservations();

  return runInTransaction(async (session) => {
    const payment = await paymentsRepository.findById(paymentId, session);

    if (!payment) {
      throw new AppError("Pago no encontrado", 404);
    }

    const order = await getOrderForPayment(payment.orderId.toString(), session);
    assertOrderAccess(actor, order);

    if (order.stockReservationStatus === "RESERVED") {
      for (const item of order.items) {
        const producto = await Producto.findById(item.productoId).session(
          session
        );

        if (!producto) {
          continue;
        }

        const variante = findVariantByIdentity(producto.variantes as Variante[], {
          variantId: item.variante.variantId,
          color: item.variante.color,
          talla: item.variante.talla,
        });

        if (!variante) {
          continue;
        }

        await releaseReservedStockForOrder(
          {
            producto,
            variante,
            cantidad: item.cantidad,
          },
          session
        );
      }
    }

    payment.status = "FAILED";
    payment.failedAt = new Date();
    payment.failureReason = input.reason || null;
    await payment.save({ session });

    order.paymentStatus = "FAILED";
    order.orderStatus = "CANCELLED";
    order.fulfillmentStatus = "CANCELLED";
    order.stockReservationStatus = "RELEASED";
    order.reservedAt = null;
    order.reservationExpiresAt = null;
    await order.save({ session });
    await syncFulfillmentForOrder(order, session);

    await recordAuditEventSafe(
      {
        action: "PAYMENT_FAILED",
        entityType: "PAYMENT",
        entityId: payment._id.toString(),
        actorId: actor.id,
        actorRole: actor.role,
        status: "SUCCESS",
        metadata: {
          orderId: order._id.toString(),
          reason: input.reason || null,
        },
      },
      session
    );

    return { payment, order };
  });
}

export async function refundPaymentTransaction(
  actor: AuthActor,
  paymentId: string,
  input: RefundPaymentInput
) {
  if (!["ADMIN", "VENDEDOR"].includes(actor.role)) {
    throw new AppError("No autorizado", 403);
  }

  assertObjectId(paymentId, "Pago invalido");
  await connectDB();

  return runInTransaction(async (session) => {
    const payment = await paymentsRepository.findById(paymentId, session);

    if (!payment) {
      throw new AppError("Pago no encontrado", 404);
    }

    const order = await getOrderForPayment(payment.orderId.toString(), session);

    if (payment.status === "REFUNDED") {
      return { payment, order, venta: null };
    }

    const venta = order.sourceSaleId
      ? await Venta.findById(order.sourceSaleId).session(session)
      : null;

    if (venta && venta.estado !== "CANCELADA") {
      for (const item of venta.items) {
        const producto = await Producto.findById(item.productoId).session(
          session
        );

        if (!producto) {
          continue;
        }

        const variante = findVariantByIdentity(producto.variantes as Variante[], {
          variantId: item.variante.variantId,
          color: item.variante.color,
          talla: item.variante.talla,
        });

        if (!variante) {
          continue;
        }

        const stockAnterior = variante.stock;
        variante.stock += item.cantidad;
        producto.totalVendidos = Math.max(
          0,
          producto.totalVendidos - item.cantidad
        );
        await producto.save({ session });

        await recordInventoryMovement(
          {
            producto,
            variante,
            tipo: "DEVOLUCION",
            cantidad: item.cantidad,
            stockAnterior,
            stockActual: variante.stock,
            motivo: input.reason || "Reembolso de pedido",
            referencia: "ORDER_PAYMENT_REFUND",
            userId: actor.id,
          },
          session
        );
      }

      venta.estado = "CANCELADA";
      await venta.save({ session });
    }

    payment.status = "REFUNDED";
    payment.refundedAt = new Date();
    payment.failureReason = input.reason || payment.failureReason || null;
    await payment.save({ session });

    order.paymentStatus = "REFUNDED";
    order.orderStatus = "CANCELLED";
    order.fulfillmentStatus = "CANCELLED";
    order.stockReservationStatus = "RELEASED";
    order.reservedAt = null;
    order.reservationExpiresAt = null;
    await order.save({ session });
    await syncFulfillmentForOrder(order, session);

    await recordAuditEventSafe(
      {
        action: "PAYMENT_REFUNDED",
        entityType: "PAYMENT",
        entityId: payment._id.toString(),
        actorId: actor.id,
        actorRole: actor.role,
        status: "SUCCESS",
        metadata: {
          orderId: order._id.toString(),
          saleId: venta?._id?.toString() || null,
          reason: input.reason || null,
        },
      },
      session
    );

    return { payment, order, venta };
  });
}
