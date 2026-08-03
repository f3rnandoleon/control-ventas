import mongoose from "mongoose";
import { createHash, randomUUID } from "crypto";
import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import Producto from "@/models/producto";
import {
  consumeReservedStockForOrder,
  recordInventoryMovement,
  releaseReservedStockForOrder,
} from "@/modules/inventory/application/inventory.service";
import { syncFulfillmentForOrder } from "@/modules/fulfillment/application/fulfillment.service";
import { paymentsRepository } from "@/modules/payments/infrastructure/payments.repository";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { findVariantByIdentity } from "@/utils/varianteIdentity";
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
  rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
};

const REVIEW_TOKEN_PURPOSE = "PAYMENT_PROOF_REVIEW";
const REVIEW_TOKEN_EXPIRATION_HOURS = 48;

type PaymentReviewPedido = {
  _id: mongoose.Types.ObjectId;
  numeroPedido: string;
  canal: string;
  metodoPago: string;
  subtotal: number;
  descuento: number;
  total: number;
  estadoPedido: string;
  estadoPago: string;
  estadoEntrega: string;
  createdAt: Date;
  notas?: string | null;
  snapshotCliente?: {
    nombreCompleto?: string | null;
    email?: string | null;
    telefono?: string | null;
    tipoDocumento?: string | null;
    numeroDocumento?: string | null;
  } | null;
  snapshotEntrega?: {
    metodo?: string | null;
    puntoRecojo?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    nombreDestinatario?: string | null;
    programadoPara?: string | null;
    departamento?: string | null;
    ciudad?: string | null;
    empresaEnvio?: string | null;
    sucursal?: string | null;
    nombreRemitente?: string | null;
    ciRemitente?: string | null;
    telefonoRemitente?: string | null;
  } | null;
  items: Array<{
    productoSnapshot: {
      nombre: string;
      modelo?: string;
      sku?: string;
      imagen?: string;
    };
    variante: {
      varianteId?: string;
      color: string;
      talla: string;
      colorSecundario?: string;
    };
    cantidad: number;
    precioUnitario: number;
    totalLinea: number;
  }>;
};

function hashReviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createReviewTokenExpirationDate() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + REVIEW_TOKEN_EXPIRATION_HOURS);
  return expiresAt;
}

function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

function createPaymentNumber() {
  return `P-${Date.now()}`;
}

function createDirectSalePaymentIdempotencyKey(pedidoId: string) {
  return `direct-sale-payment-${pedidoId}`;
}

export async function createImmediatePaidPaymentForOrder(
  input: {
    pedidoId: string;
    clienteId?: string | null;
    metodoPago: "EFECTIVO" | "QR";
    monto: number;
    referenciaExterna?: string | null;
  },
  session?: mongoose.ClientSession
) {
  const existingPayment = await paymentsRepository.findLatestPaidByOrder(
    input.pedidoId,
    session
  );

  if (existingPayment) {
    return existingPayment;
  }

  return paymentsRepository.create(
    {
      numeroPago: createPaymentNumber(),
      pedidoId: input.pedidoId,
      cliente: input.clienteId || null,
      metodoPago: input.metodoPago,
      monto: input.monto,
      estado: "PAID",
      idempotencyKey: createDirectSalePaymentIdempotencyKey(input.pedidoId),
      referenciaExterna: input.referenciaExterna || null,
      confirmadoEn: new Date(),
      falladoEn: null,
      reembolsadoEn: null,
      motivoFallo: null,
    },
    session
  );
}

async function getPedidoForPayment(
  pedidoId: string,
  session?: mongoose.ClientSession
) {
  const pedido = await Pedido.findById(pedidoId).session(session ?? null);

  if (!pedido) {
    throw new AppError("Pedido no encontrado", 404);
  }

  return pedido;
}

function assertPedidoAccess(actor: AuthActor, pedido: { cliente?: mongoose.Types.ObjectId | null }) {
  if (
    actor.rol === "CLIENTE" &&
    pedido.cliente?.toString() !== actor.id
  ) {
    throw new AppError("No autorizado", 403);
  }
}

function assertStaffActor(actor: AuthActor) {
  if (!["ADMIN", "VENDEDOR"].includes(actor.rol)) {
    throw new AppError("No autorizado", 403);
  }
}

async function rejectNonStaffPaymentAttempt(
  actor: AuthActor,
  paymentId: string,
  action: string,
  session?: mongoose.ClientSession
) {
  if (["ADMIN", "VENDEDOR"].includes(actor.rol)) {
    return;
  }

  await recordAuditEventSafe(
    {
      accion: action,
      tipoEntidad: "PAYMENT",
      idEntidad: paymentId,
      idActor: mongoose.Types.ObjectId.isValid(actor.id) ? actor.id : null,
      rolActor: actor.rol,
      estado: "FAILED",
      metadata: {
        reason: "ROLE_NOT_ALLOWED",
      },
    },
    session
  );

  throw new AppError("No autorizado", 403);
}

async function consumeStockForPedido(
  pedido: InstanceType<typeof Pedido>,
  actor: AuthActor,
  session?: mongoose.ClientSession
) {
  if (pedido.estadoReservaStock === "CONSUMED") {
    return;
  }

  for (const item of pedido.items) {
    const producto = await Producto.findById(item.productoId).session(
      session ?? null
    );

    if (!producto) {
      throw new AppError("Producto no encontrado durante confirmacion de pago", 404);
    }

    const variante = findVariantByIdentity(producto.variantes as Variante[], {
      varianteId: item.variante.varianteId,
      color: item.variante.color,
      colorSecundario: item.variante.colorSecundario,
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
        motivo: "Pedido web confirmado",
        referencia: "ORDER_PAYMENT_CONFIRM",
      },
      session
    );
  }

  pedido.estadoReservaStock = "CONSUMED";
  pedido.reservadoEn = null;
  pedido.reservaExpiraEn = null;
}

export async function createPaymentTransaction(
  actor: AuthActor,
  input: CreatePaymentTransactionInput
) {
  assertObjectId(input.pedidoId, "ID de pedido invalido");
  await connectDB();

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

    const pedido = await getPedidoForPayment(input.pedidoId, session);
    assertPedidoAccess(actor, pedido);

    if (
      pedido.estadoReservaStock === "RELEASED" &&
      pedido.estadoPago !== "PAID"
    ) {
      throw new AppError(
        "La reserva de stock de este pedido ya no esta activa",
        409
      );
    }

    const paidPayment = await paymentsRepository.findLatestPaidByOrder(
      input.pedidoId,
      session
    );

    if (paidPayment) {
      throw new AppError("Este pedido ya tiene un pago confirmado", 409);
    }

    const paymentPayload: Record<string, unknown> = {
      numeroPago: createPaymentNumber(),
      pedidoId: pedido._id,
      cliente: pedido.cliente || null,
      metodoPago: input.metodoPago,
      monto: pedido.total,
      estado: "PENDING",
      referenciaExterna: input.referenciaExterna || null,
    };

    if (input.idempotencyKey) {
      paymentPayload.idempotencyKey = input.idempotencyKey;
    }

    const payment = await paymentsRepository.create(paymentPayload, session);

    await recordAuditEventSafe(
      {
        accion: "PAYMENT_CREATED",
        tipoEntidad: "PAYMENT",
        idEntidad: payment._id.toString(),
        idActor: actor.id,
        rolActor: actor.rol,
        estado: "SUCCESS",
        metadata: {
          pedidoId: pedido._id.toString(),
          monto: payment.monto,
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
  await rejectNonStaffPaymentAttempt(actor, paymentId, "PAYMENT_CONFIRM_REJECTED");
  assertStaffActor(actor);

  return runInTransaction(async (session) => {
    const payment = await paymentsRepository.findById(paymentId, session);

    if (!payment) {
      throw new AppError("Pago no encontrado", 404);
    }

    const pedido = await getPedidoForPayment(payment.pedidoId.toString(), session);

    if (payment.metodoPago !== pedido.metodoPago) {
      throw new AppError("El metodo de pago no coincide con el pedido", 409);
    }

    if (
      pedido.estadoPedido === "CANCELLED" &&
      pedido.estadoReservaStock === "RELEASED"
    ) {
      throw new AppError("La reserva de stock de este pedido ya expiro", 409);
    }

    if (payment.estado === "REFUNDED") {
      throw new AppError("El pago ya fue reembolsado", 400);
    }

    await consumeStockForPedido(pedido, actor, session);

    if (payment.estado !== "PAID") {
      payment.estado = "PAID";
      payment.confirmadoEn = new Date();
      payment.falladoEn = null;
      payment.motivoFallo = null;
      if (input.referenciaExterna) {
        payment.referenciaExterna = input.referenciaExterna;
      }
      await payment.save({ session });
    }

    pedido.estadoPago = "PAID";
    pedido.estadoPedido = "CONFIRMED";
    if (pedido.estadoEntrega === "CANCELLED") {
      pedido.estadoEntrega = pedido.snapshotEntrega?.metodo
        ? "PENDING"
        : "NOT_APPLICABLE";
    }
    await pedido.save({ session });
    await syncFulfillmentForOrder(pedido, session);

    await recordAuditEventSafe(
      {
        accion: "PAYMENT_CONFIRMED",
        tipoEntidad: "PAYMENT",
        idEntidad: payment._id.toString(),
        idActor: actor.id,
        rolActor: actor.rol,
        estado: "SUCCESS",
        metadata: {
          pedidoId: pedido._id.toString(),
        },
      },
      session
    );

    return { payment, pedido };
  });
}

export async function failPaymentTransaction(
  actor: AuthActor,
  paymentId: string,
  input: FailPaymentInput
) {
  assertObjectId(paymentId, "Pago invalido");
  await connectDB();
  await rejectNonStaffPaymentAttempt(actor, paymentId, "PAYMENT_FAIL_REJECTED");
  assertStaffActor(actor);

  return runInTransaction(async (session) => {
    const payment = await paymentsRepository.findById(paymentId, session);

    if (!payment) {
      throw new AppError("Pago no encontrado", 404);
    }

    const pedido = await getPedidoForPayment(payment.pedidoId.toString(), session);

    if (payment.metodoPago !== pedido.metodoPago) {
      throw new AppError("El metodo de pago no coincide con el pedido", 409);
    }

    if (pedido.estadoReservaStock === "RESERVED") {
      for (const item of pedido.items) {
        const producto = await Producto.findById(item.productoId).session(
          session
        );

        if (!producto) {
          continue;
        }

        const variante = findVariantByIdentity(producto.variantes as Variante[], {
          varianteId: item.variante.varianteId,
          color: item.variante.color,
          colorSecundario: item.variante.colorSecundario,
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

    payment.estado = "FAILED";
    payment.falladoEn = new Date();
    payment.motivoFallo = input.motivo || "Pago fallido";
    await payment.save({ session });

    pedido.estadoPago = "FAILED";
    pedido.estadoPedido = "CANCELLED";
    pedido.estadoEntrega = "CANCELLED";
    pedido.estadoReservaStock = "RELEASED";
    pedido.reservadoEn = null;
    pedido.reservaExpiraEn = null;
    pedido.motivoCancelacion = input.motivo || "Pago fallido";
    await pedido.save({ session });
    await syncFulfillmentForOrder(pedido, session);

    await recordAuditEventSafe(
      {
        accion: "PAYMENT_FAILED",
        tipoEntidad: "PAYMENT",
        idEntidad: payment._id.toString(),
        idActor: actor.id,
        rolActor: actor.rol,
        estado: "SUCCESS",
        metadata: {
          pedidoId: pedido._id.toString(),
          reason: input.motivo || null,
        },
      },
      session
    );

    return { payment, pedido };
  });
}

export async function refundPaymentTransaction(
  actor: AuthActor,
  paymentId: string,
  input: RefundPaymentInput
) {
  assertStaffActor(actor);
  assertObjectId(paymentId, "Pago invalido");
  await connectDB();

  return runInTransaction(async (session) => {
    const payment = await paymentsRepository.findById(paymentId, session);

    if (!payment) {
      throw new AppError("Pago no encontrado", 404);
    }

    if (payment.estado !== "PAID") {
      throw new AppError("Solo se pueden reembolsar pagos completados", 400);
    }

    const pedido = await getPedidoForPayment(payment.pedidoId.toString(), session);
    assertPedidoAccess(actor, pedido);

    // 1. Restaurar stock
    for (const item of pedido.items) {
      const producto = await Producto.findById(item.productoId).session(session);
      if (!producto) continue;

      const variante = findVariantByIdentity(producto.variantes as Variante[], {
        varianteId: item.variante.varianteId,
        color: item.variante.color,
        colorSecundario: item.variante.colorSecundario,
        talla: item.variante.talla,
      });

      if (variante) {
        const stockAnterior = variante.stock;
        variante.stock += item.cantidad;
        await producto.save({ session });

        await recordInventoryMovement(
          {
            producto,
            variante,
            tipo: "DEVOLUCION",
            cantidad: item.cantidad,
            stockAnterior,
            stockActual: variante.stock,
            motivo: input.motivo || "Reembolso de pedido",
            referencia: "ORDER_PAYMENT_REFUND",
            userId: actor.id,
          },
          session
        );
      }
    }

    payment.estado = "REFUNDED";
    payment.reembolsadoEn = new Date();
    if (input.motivo) {
      payment.motivoFallo = `Reembolso: ${input.motivo}`;
    }
    await payment.save({ session });

    pedido.estadoPago = "REFUNDED";
    pedido.estadoPedido = "CANCELLED";
    pedido.estadoEntrega = "CANCELLED";
    pedido.estadoReservaStock = "RELEASED";
    pedido.reservadoEn = null;
    pedido.reservaExpiraEn = null;
    pedido.motivoCancelacion = input.motivo || "Reembolsado";
    await pedido.save({ session });
    await syncFulfillmentForOrder(pedido, session);

    await recordAuditEventSafe(
      {
        accion: "PAYMENT_REFUNDED",
        tipoEntidad: "PAYMENT",
        idEntidad: payment._id.toString(),
        idActor: actor.id,
        rolActor: actor.rol,
        estado: "SUCCESS",
        metadata: {
          pedidoId: pedido._id.toString(),
          motivo: input.motivo || null,
        },
      },
      session
    );

    return { payment, pedido };
  });
}

// ============================================================
// FLUJO QR: COMPROBANTE + VERIFICACION POR LINK/TOKEN
// ============================================================

export async function uploadComprobanteAndGenerateToken(
  paymentId: string,
  comprobanteUrl: string,
  idActor: string
) {
  assertObjectId(paymentId, "Pago invalido");
  await connectDB();

  const payment = await paymentsRepository.findById(paymentId);
  if (!payment) throw new AppError("Pago no encontrado", 404);
  if (payment.cliente?.toString() !== idActor) throw new AppError("No autorizado", 403);
  if (payment.estado !== "PENDING") throw new AppError("El pago ya fue procesado", 409);

  const tokenRevision = randomUUID();
  payment.urlComprobante = comprobanteUrl;
  payment.tokenRevision = undefined;
  payment.tokenRevisionHash = hashReviewToken(tokenRevision);
  payment.tokenRevisionPurpose = REVIEW_TOKEN_PURPOSE;
  payment.tokenRevisionExpiresAt = createReviewTokenExpirationDate();
  payment.tokenRevisionUsedAt = null;
  payment.tokenRevisionUsedBy = null;
  payment.tokenRevisionUsado = false;
  await payment.save();

  const pedido = await Pedido.findById(payment.pedidoId);
  if (pedido && pedido.estadoReservaStock === "RESERVED") {
    const extendedDate = new Date();
    extendedDate.setHours(extendedDate.getHours() + 48);
    pedido.reservaExpiraEn = extendedDate;
    await pedido.save();
  }

  return { payment, tokenRevision };
}

export async function getPaymentByReviewToken(
  token: string,
  options: { includeStaffDetails?: boolean } = {}
) {
  await connectDB();
  const payment = await paymentsRepository.findByReviewTokenHash(hashReviewToken(token));
  if (!payment) throw new AppError("Link de verificacion invalido", 404);
  const pedido = await Pedido.findById(payment.pedidoId)
    .lean<PaymentReviewPedido | null>();
  if (!pedido) throw new AppError("Pedido no encontrado", 404);

  const includeStaffDetails = options.includeStaffDetails === true;
  const publicSnapshotEntrega = pedido.snapshotEntrega
    ? {
        metodo: pedido.snapshotEntrega.metodo,
        departamento: pedido.snapshotEntrega.departamento,
        ciudad: pedido.snapshotEntrega.ciudad,
        empresaEnvio: pedido.snapshotEntrega.empresaEnvio,
        sucursal: pedido.snapshotEntrega.sucursal,
      }
    : null;
  const staffSnapshotEntrega = pedido.snapshotEntrega
    ? {
        metodo: pedido.snapshotEntrega.metodo,
        puntoRecojo: pedido.snapshotEntrega.puntoRecojo,
        direccion: pedido.snapshotEntrega.direccion,
        telefono: pedido.snapshotEntrega.telefono,
        nombreDestinatario: pedido.snapshotEntrega.nombreDestinatario,
        programadoPara: pedido.snapshotEntrega.programadoPara,
        departamento: pedido.snapshotEntrega.departamento,
        ciudad: pedido.snapshotEntrega.ciudad,
        empresaEnvio: pedido.snapshotEntrega.empresaEnvio,
        sucursal: pedido.snapshotEntrega.sucursal,
        nombreRemitente: pedido.snapshotEntrega.nombreRemitente,
        ciRemitente: pedido.snapshotEntrega.ciRemitente,
        telefonoRemitente: pedido.snapshotEntrega.telefonoRemitente,
      }
    : null;

  return {
    payment: {
      ...(includeStaffDetails ? { _id: payment._id.toString() } : {}),
      numeroPago: payment.numeroPago,
      metodoPago: payment.metodoPago,
      monto: payment.monto,
      estado: payment.estado,
      urlComprobante: payment.urlComprobante,
      createdAt: payment.createdAt,
    },
    pedido: {
      ...(includeStaffDetails ? { _id: pedido._id.toString() } : {}),
      numeroPedido: pedido.numeroPedido,
      canal: pedido.canal,
      metodoPago: pedido.metodoPago,
      subtotal: pedido.subtotal,
      descuento: pedido.descuento,
      total: pedido.total,
      estadoPedido: pedido.estadoPedido,
      estadoPago: pedido.estadoPago,
      estadoEntrega: pedido.estadoEntrega,
      createdAt: pedido.createdAt,
      ...(includeStaffDetails
        ? {
            notas: pedido.notas,
            snapshotCliente: pedido.snapshotCliente
              ? {
                  nombreCompleto: pedido.snapshotCliente.nombreCompleto,
                  email: pedido.snapshotCliente.email,
                  telefono: pedido.snapshotCliente.telefono,
                  tipoDocumento: pedido.snapshotCliente.tipoDocumento,
                  numeroDocumento: pedido.snapshotCliente.numeroDocumento,
                }
              : null,
          }
        : {}),
      snapshotEntrega: includeStaffDetails
        ? staffSnapshotEntrega
        : publicSnapshotEntrega,
      items: pedido.items.map((item) => ({
        productoSnapshot: {
          nombre: item.productoSnapshot.nombre,
          modelo: item.productoSnapshot.modelo,
          ...(includeStaffDetails ? { sku: item.productoSnapshot.sku } : {}),
          imagen: item.productoSnapshot.imagen,
        },
        variante: {
          ...(includeStaffDetails ? { varianteId: item.variante.varianteId } : {}),
          color: item.variante.color,
          talla: item.variante.talla,
          colorSecundario: item.variante.colorSecundario,
        },
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        totalLinea: item.totalLinea,
      })),
    },
  };
}

export async function confirmPaymentByToken(
  actor: AuthActor,
  token: string,
  input: ConfirmPaymentInput = {}
) {
  assertStaffActor(actor);
  await connectDB();
  return runInTransaction(async (session) => {
    const payment = await paymentsRepository.consumeReviewTokenHash(
      hashReviewToken(token),
      actor.id,
      session
    );
    if (!payment) throw new AppError("Link invalido", 404);
    if (payment.estado !== "PENDING") throw new AppError("El pago ya fue procesado", 409);
    const pedido = await getPedidoForPayment(payment.pedidoId.toString(), session);
    if (pedido.estadoPedido === "CANCELLED") throw new AppError("El pedido ya fue cancelado", 409);
    if (payment.metodoPago !== pedido.metodoPago) {
      throw new AppError("El metodo de pago no coincide con el pedido", 409);
    }

    await consumeStockForPedido(pedido, actor, session);

    payment.estado = "PAID";
    payment.confirmadoEn = new Date();
    payment.falladoEn = null;
    payment.motivoFallo = null;
    if (input.referenciaExterna) payment.referenciaExterna = input.referenciaExterna;
    await payment.save({ session });
    pedido.estadoPago = "PAID"; pedido.estadoPedido = "CONFIRMED";
    
    if (pedido.estadoEntrega !== "DELIVERED") {
      pedido.estadoEntrega = pedido.snapshotEntrega?.metodo ? "PENDING" : "NOT_APPLICABLE";
    }
    await pedido.save({ session });
    await syncFulfillmentForOrder(pedido, session);
    await recordAuditEventSafe({ accion: "PAYMENT_CONFIRMED", tipoEntidad: "PAYMENT", idEntidad: payment._id.toString(), idActor: actor.id, rolActor: actor.rol, estado: "SUCCESS", metadata: { pedidoId: pedido._id.toString(), via: "token_revision" } }, session);
    return { payment, pedido };
  });
}

export async function rejectPaymentByToken(
  actor: AuthActor,
  token: string,
  reason?: string
) {
  assertStaffActor(actor);
  await connectDB();
  return runInTransaction(async (session) => {
    const payment = await paymentsRepository.consumeReviewTokenHash(
      hashReviewToken(token),
      actor.id,
      session
    );
    if (!payment) throw new AppError("Link invalido", 404);
    if (payment.estado !== "PENDING") throw new AppError("El pago ya fue procesado", 409);
    const pedido = await getPedidoForPayment(payment.pedidoId.toString(), session);
    if (payment.metodoPago !== pedido.metodoPago) {
      throw new AppError("El metodo de pago no coincide con el pedido", 409);
    }
    if (pedido.estadoReservaStock === "RESERVED") {
      for (const item of pedido.items) {
        const producto = await Producto.findById(item.productoId).session(session);
        if (!producto) continue;
        const variante = findVariantByIdentity(producto.variantes as Variante[], { varianteId: item.variante.varianteId, color: item.variante.color, colorSecundario: item.variante.colorSecundario, talla: item.variante.talla });
        if (!variante) continue;
        await releaseReservedStockForOrder({ producto, variante, cantidad: item.cantidad }, session);
      }
    }
    payment.estado = "FAILED"; payment.falladoEn = new Date();
    payment.motivoFallo = reason || "Comprobante rechazado";
    await payment.save({ session });
    pedido.estadoPago = "FAILED"; pedido.estadoPedido = "CANCELLED";
    pedido.estadoEntrega = "CANCELLED"; pedido.estadoReservaStock = "RELEASED";
    pedido.reservadoEn = null; pedido.reservaExpiraEn = null;
    pedido.motivoCancelacion = reason || "Comprobante rechazado";
    await pedido.save({ session });
    await syncFulfillmentForOrder(pedido, session);
    await recordAuditEventSafe({ accion: "PAYMENT_FAILED", tipoEntidad: "PAYMENT", idEntidad: payment._id.toString(), idActor: actor.id, rolActor: actor.rol, estado: "SUCCESS", metadata: { pedidoId: pedido._id.toString(), via: "token_revision", reason } }, session);
    return { payment, pedido };
  });
}

export async function confirmCashOrder(pedidoId: string, actor: AuthActor) {
  assertObjectId(pedidoId, "Pedido invalido");
  await connectDB();

  return runInTransaction(async (session) => {
    const pedido = await getPedidoForPayment(pedidoId, session);

    if (pedido.metodoPago !== "EFECTIVO") {
      throw new AppError("El pedido no es en efectivo", 400);
    }

    if (pedido.estadoPago === "PAID") {
      throw new AppError("El pedido ya está pagado", 400);
    }

    if (
      pedido.estadoReservaStock === "RELEASED" &&
      pedido.estadoPago !== "PAID"
    ) {
      throw new AppError(
        "La reserva de stock de este pedido ya no esta activa",
        409
      );
    }

    const payment = await createImmediatePaidPaymentForOrder(
      {
        pedidoId,
        clienteId: pedido.cliente?.toString(),
        metodoPago: "EFECTIVO",
        monto: pedido.total,
        referenciaExterna: "CASH_PANEL_CONFIRM_BY_ADMIN",
      },
      session
    );

    await consumeStockForPedido(pedido, actor, session);

    pedido.estadoPago = "PAID";
    pedido.estadoPedido = "DELIVERED";
    pedido.estadoEntrega = "DELIVERED";
    await pedido.save({ session });

    await recordAuditEventSafe(
      {
        accion: "ORDER_PAYMENT_CONFIRMED_CASH",
        tipoEntidad: "ORDER",
        idEntidad: pedido._id.toString(),
        idActor: actor.id,
        rolActor: actor.rol,
        estado: "SUCCESS",
        metadata: {
          paymentId: payment._id.toString(),
        },
      },
      session
    );

    return { pedido, payment };
  });
}
