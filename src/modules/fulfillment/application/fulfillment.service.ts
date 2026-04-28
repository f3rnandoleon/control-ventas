import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import { pedidosRepository } from "@/modules/orders/infrastructure/pedidos.repository";
import { fulfillmentRepository } from "@/modules/fulfillment/infrastructure/fulfillment.repository";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { AppError } from "@/shared/errors/AppError";
import { runInTransaction } from "@/shared/db/runTransaction";
import type {
  CreateFulfillmentInput,
  UpdateFulfillmentStatusInput,
} from "@/schemas/fulfillment.schema";

type SupportedRole = "ADMIN" | "VENDEDOR" | "CLIENTE";
type PedidoDocument = InstanceType<typeof Pedido>;

function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

function resolveRefId(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value &&
    value._id
  ) {
    return value._id as string | mongoose.Types.ObjectId;
  }

  return null;
}

function deriveFulfillmentStatus(pedido: PedidoDocument) {
  if (pedido.estadoPedido === "CANCELLED") {
    return "CANCELLED" as const;
  }

  if (!pedido.snapshotEntrega?.metodo || pedido.snapshotEntrega.metodo === "WHATSAPP") {
    return "NOT_APPLICABLE" as const;
  }

  if (pedido.estadoEntrega === "NOT_APPLICABLE") {
    return "PENDING" as const;
  }

  return pedido.estadoEntrega;
}

function buildFulfillmentPayload(pedido: PedidoDocument) {
  return {
    pedidoId: pedido._id,
    numeroPedido: pedido.numeroPedido,
    cliente: resolveRefId(pedido.cliente),
    vendedor: resolveRefId(pedido.vendedor),
    canal: pedido.canal,
    metodo: pedido.snapshotEntrega?.metodo || null,
    estado: deriveFulfillmentStatus(pedido),
    puntoRecojo: pedido.snapshotEntrega?.puntoRecojo || null,
    direccion: pedido.snapshotEntrega?.direccion || null,
    telefono:
      pedido.snapshotEntrega?.telefono ||
      pedido.snapshotCliente?.telefono ||
      null,
    nombreDestinatario:
      pedido.snapshotEntrega?.nombreDestinatario ||
      pedido.snapshotCliente?.nombreCompleto ||
      null,
  };
}

function applyStatusTimestamps(
  currentStatus: string | undefined,
  nextStatus: string,
  payload: Record<string, unknown>
) {
  if (currentStatus === nextStatus) {
    return payload;
  }

  const now = new Date();

  if (nextStatus === "READY" && !payload.preparadoEn) {
    payload.preparadoEn = now;
  }

  if (nextStatus === "IN_TRANSIT" && !payload.enTransitoEn) {
    payload.enTransitoEn = now;
  }

  if (nextStatus === "DELIVERED" && !payload.entregadoEn) {
    payload.entregadoEn = now;
  }

  if (nextStatus === "CANCELLED" && !payload.canceladoEn) {
    payload.canceladoEn = now;
  }

  return payload;
}

export async function syncFulfillmentForOrder(
  orderOrId: string | PedidoDocument,
  session?: ClientSession
) {
  await connectDB();

  const pedido =
    typeof orderOrId === "string"
      ? await Pedido.findById(orderOrId).session(session ?? null)
      : orderOrId;

  if (!pedido) {
    throw new AppError("Pedido no encontrado para fulfillment", 404);
  }

  const currentFulfillment = await fulfillmentRepository.findByOrderId(
    pedido._id.toString(),
    session
  );

  const payload = buildFulfillmentPayload(pedido);
  const nextPayload: Record<string, unknown> = {
    ...payload,
    codigoSeguimiento: currentFulfillment?.codigoSeguimiento || null,
    nombreTransportista: currentFulfillment?.nombreTransportista || null,
    asignadoA: resolveRefId(currentFulfillment?.asignadoA) || null,
    notas: currentFulfillment?.notas || null,
    preparadoEn: currentFulfillment?.preparadoEn || null,
    enTransitoEn: currentFulfillment?.enTransitoEn || null,
    entregadoEn: currentFulfillment?.entregadoEn || null,
    canceladoEn: currentFulfillment?.canceladoEn || null,
  };

  applyStatusTimestamps(
    currentFulfillment?.estado,
    payload.estado,
    nextPayload
  );

  return fulfillmentRepository.upsertByOrderId(
    pedido._id.toString(),
    nextPayload,
    session
  );
}

export async function getFulfillmentByOrderForActor(
  role: SupportedRole,
  userId: string,
  pedidoId: string
) {
  assertObjectId(pedidoId, "ID de pedido invalido");
  await connectDB();

  const pedido =
    role === "CLIENTE"
      ? await pedidosRepository.findByIdForCustomer(pedidoId, userId)
      : await pedidosRepository.findById(pedidoId);

  if (!pedido) {
    throw new AppError("Pedido no encontrado", 404);
  }

  const existing = await fulfillmentRepository.findByOrderId(pedidoId);
  if (existing) {
    return existing;
  }

  return syncFulfillmentForOrder(pedido);
}

export async function createOrSyncFulfillmentForOrder(
  pedidoId: string,
  payload: CreateFulfillmentInput
) {
  assertObjectId(pedidoId, "ID de pedido invalido");

  if (payload.asignadoA) {
    assertObjectId(payload.asignadoA, "asignadoA invalido");
  }

  return runInTransaction(async (session) => {
    const fulfillment = await syncFulfillmentForOrder(pedidoId, session);

    const nextPayload: Record<string, unknown> = {};

    if (payload.codigoSeguimiento !== undefined) {
      nextPayload.codigoSeguimiento = payload.codigoSeguimiento;
    }

    if (payload.nombreTransportista !== undefined) {
      nextPayload.nombreTransportista = payload.nombreTransportista;
    }

    if (payload.notas !== undefined) {
      nextPayload.notas = payload.notas;
    }

    if (payload.asignadoA !== undefined) {
      nextPayload.asignadoA = payload.asignadoA;
    }

    if (Object.keys(nextPayload).length === 0) {
      return fulfillment;
    }

    const updated = await fulfillmentRepository.updateById(
      fulfillment._id.toString(),
      nextPayload,
      session
    );

    if (!updated) {
      throw new AppError("Fulfillment no encontrado", 404);
    }

    return updated;
  });
}

export async function updateFulfillmentStatusById(
  id: string,
  payload: UpdateFulfillmentStatusInput
) {
  assertObjectId(id, "ID de fulfillment invalido");

  if (payload.asignadoA) {
    assertObjectId(payload.asignadoA, "asignadoA invalido");
  }

  return runInTransaction(async (session) => {
    const fulfillment = await fulfillmentRepository.findById(id, session);

    if (!fulfillment) {
      throw new AppError("Fulfillment no encontrado", 404);
    }

    const pedido = await pedidosRepository.findById(
      fulfillment.pedidoId.toString(),
      session
    );

    if (!pedido) {
      throw new AppError("Pedido no encontrado", 404);
    }

    if (
      ["READY", "IN_TRANSIT", "DELIVERED"].includes(payload.estado) &&
      pedido.estadoPago !== "PAID"
    ) {
      throw new AppError(
        "No se puede avanzar el fulfillment de un pedido sin pago confirmado",
        409
      );
    }

    const nextPayload: Record<string, unknown> = {
      estado: payload.estado,
    };

    if (payload.codigoSeguimiento !== undefined) {
      nextPayload.codigoSeguimiento = payload.codigoSeguimiento;
    }

    if (payload.nombreTransportista !== undefined) {
      nextPayload.nombreTransportista = payload.nombreTransportista;
    }

    if (payload.asignadoA !== undefined) {
      nextPayload.asignadoA = payload.asignadoA;
    }

    if (payload.notas !== undefined) {
      nextPayload.notas = payload.notas;
    }

    applyStatusTimestamps(fulfillment.estado, payload.estado, nextPayload);

    const updatedFulfillment = await fulfillmentRepository.updateById(
      id,
      nextPayload,
      session
    );

    if (!updatedFulfillment) {
      throw new AppError("Fulfillment no encontrado", 404);
    }

    pedido.estadoEntrega = payload.estado;

    if (payload.estado === "READY") {
      pedido.estadoPedido = "READY";
    } else if (payload.estado === "IN_TRANSIT") {
      pedido.estadoPedido = "IN_TRANSIT";
    } else if (payload.estado === "DELIVERED") {
      pedido.estadoPedido = "DELIVERED";
    } else if (payload.estado === "CANCELLED") {
      pedido.estadoPedido = "CANCELLED";
    } else if (payload.estado === "PENDING") {
      if (pedido.estadoPago === "PAID" && pedido.estadoPedido !== "PREPARING") {
        pedido.estadoPedido = "CONFIRMED";
      }
    }

    await pedido.save({ session });

    await recordAuditEventSafe(
      {
        accion: "FULFILLMENT_STATUS_UPDATED",
        tipoEntidad: "FULFILLMENT",
        idEntidad: updatedFulfillment._id.toString(),
        estado: "SUCCESS",
        metadata: {
          pedidoId: pedido._id.toString(),
          estado: payload.estado,
          codigoSeguimiento: payload.codigoSeguimiento || null,
        },
      },
      session
    );

    return {
      entrega: updatedFulfillment,
      pedido,
    };
  });
}
