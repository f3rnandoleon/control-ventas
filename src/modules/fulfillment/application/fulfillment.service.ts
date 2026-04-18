import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Order from "@/models/order";
import { ordersRepository } from "@/modules/orders/infrastructure/orders.repository";
import { fulfillmentRepository } from "@/modules/fulfillment/infrastructure/fulfillment.repository";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { AppError } from "@/shared/errors/AppError";
import { runInTransaction } from "@/shared/db/runTransaction";
import type {
  CreateFulfillmentInput,
  UpdateFulfillmentStatusInput,
} from "@/schemas/fulfillment.schema";

type SupportedRole = "ADMIN" | "VENDEDOR" | "CLIENTE";
type OrderDocument = InstanceType<typeof Order>;

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

function deriveFulfillmentStatus(order: OrderDocument) {
  if (order.orderStatus === "CANCELLED") {
    return "CANCELLED" as const;
  }

  if (!order.deliverySnapshot?.method || order.deliverySnapshot.method === "WHATSAPP") {
    return "NOT_APPLICABLE" as const;
  }

  if (order.fulfillmentStatus === "NOT_APPLICABLE") {
    return "PENDING" as const;
  }

  return order.fulfillmentStatus;
}

function buildFulfillmentPayload(order: OrderDocument) {
  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    customer: resolveRefId(order.customer),
    seller: resolveRefId(order.seller),
    channel: order.channel,
    method: order.deliverySnapshot?.method || null,
    status: deriveFulfillmentStatus(order),
    pickupPoint: order.deliverySnapshot?.pickupPoint || null,
    address: order.deliverySnapshot?.address || null,
    phone:
      order.deliverySnapshot?.phone ||
      order.customerSnapshot?.phone ||
      null,
    recipientName:
      order.deliverySnapshot?.recipientName ||
      order.customerSnapshot?.fullname ||
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

  if (nextStatus === "READY" && !payload.preparedAt) {
    payload.preparedAt = now;
  }

  if (nextStatus === "IN_TRANSIT" && !payload.inTransitAt) {
    payload.inTransitAt = now;
  }

  if (nextStatus === "DELIVERED" && !payload.deliveredAt) {
    payload.deliveredAt = now;
  }

  if (nextStatus === "CANCELLED" && !payload.cancelledAt) {
    payload.cancelledAt = now;
  }

  return payload;
}

export async function syncFulfillmentForOrder(
  orderOrId: string | OrderDocument,
  session?: ClientSession
) {
  await connectDB();

  const order =
    typeof orderOrId === "string"
      ? await Order.findById(orderOrId).session(session ?? null)
      : orderOrId;

  if (!order) {
    throw new AppError("Pedido no encontrado para fulfillment", 404);
  }

  const currentFulfillment = await fulfillmentRepository.findByOrderId(
    order._id.toString(),
    session
  );

  const payload = buildFulfillmentPayload(order);
  const nextPayload: Record<string, unknown> = {
    ...payload,
    trackingCode: currentFulfillment?.trackingCode || null,
    courierName: currentFulfillment?.courierName || null,
    assignedTo: resolveRefId(currentFulfillment?.assignedTo) || null,
    notes: currentFulfillment?.notes || null,
    preparedAt: currentFulfillment?.preparedAt || null,
    inTransitAt: currentFulfillment?.inTransitAt || null,
    deliveredAt: currentFulfillment?.deliveredAt || null,
    cancelledAt: currentFulfillment?.cancelledAt || null,
  };

  applyStatusTimestamps(
    currentFulfillment?.status,
    payload.status,
    nextPayload
  );

  return fulfillmentRepository.upsertByOrderId(
    order._id.toString(),
    nextPayload,
    session
  );
}

export async function getFulfillmentByOrderForActor(
  role: SupportedRole,
  userId: string,
  orderId: string
) {
  assertObjectId(orderId, "ID de pedido invalido");
  await connectDB();

  const order =
    role === "CLIENTE"
      ? await ordersRepository.findByIdForCustomer(orderId, userId)
      : await ordersRepository.findById(orderId);

  if (!order) {
    throw new AppError("Pedido no encontrado", 404);
  }

  const existing = await fulfillmentRepository.findByOrderId(orderId);
  if (existing) {
    return existing;
  }

  return syncFulfillmentForOrder(order);
}

export async function createOrSyncFulfillmentForOrder(
  orderId: string,
  payload: CreateFulfillmentInput
) {
  assertObjectId(orderId, "ID de pedido invalido");

  if (payload.assignedTo) {
    assertObjectId(payload.assignedTo, "assignedTo invalido");
  }

  return runInTransaction(async (session) => {
    const fulfillment = await syncFulfillmentForOrder(orderId, session);

    const nextPayload: Record<string, unknown> = {};

    if (payload.trackingCode !== undefined) {
      nextPayload.trackingCode = payload.trackingCode;
    }

    if (payload.courierName !== undefined) {
      nextPayload.courierName = payload.courierName;
    }

    if (payload.notes !== undefined) {
      nextPayload.notes = payload.notes;
    }

    if (payload.assignedTo !== undefined) {
      nextPayload.assignedTo = payload.assignedTo;
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

  if (payload.assignedTo) {
    assertObjectId(payload.assignedTo, "assignedTo invalido");
  }

  return runInTransaction(async (session) => {
    const fulfillment = await fulfillmentRepository.findById(id, session);

    if (!fulfillment) {
      throw new AppError("Fulfillment no encontrado", 404);
    }

    const order = await ordersRepository.findById(
      fulfillment.orderId.toString(),
      session
    );

    if (!order) {
      throw new AppError("Pedido no encontrado", 404);
    }

    if (
      ["READY", "IN_TRANSIT", "DELIVERED"].includes(payload.status) &&
      order.paymentStatus !== "PAID"
    ) {
      throw new AppError(
        "No se puede avanzar el fulfillment de un pedido sin pago confirmado",
        409
      );
    }

    const nextPayload: Record<string, unknown> = {
      status: payload.status,
    };

    if (payload.trackingCode !== undefined) {
      nextPayload.trackingCode = payload.trackingCode;
    }

    if (payload.courierName !== undefined) {
      nextPayload.courierName = payload.courierName;
    }

    if (payload.assignedTo !== undefined) {
      nextPayload.assignedTo = payload.assignedTo;
    }

    if (payload.notes !== undefined) {
      nextPayload.notes = payload.notes;
    }

    applyStatusTimestamps(fulfillment.status, payload.status, nextPayload);

    const updatedFulfillment = await fulfillmentRepository.updateById(
      id,
      nextPayload,
      session
    );

    if (!updatedFulfillment) {
      throw new AppError("Fulfillment no encontrado", 404);
    }

    order.fulfillmentStatus = payload.status;

    if (payload.status === "READY") {
      order.orderStatus = "READY";
    } else if (payload.status === "IN_TRANSIT") {
      order.orderStatus = "IN_TRANSIT";
    } else if (payload.status === "DELIVERED") {
      order.orderStatus = "DELIVERED";
    } else if (payload.status === "CANCELLED") {
      order.orderStatus = "CANCELLED";
    } else if (payload.status === "PENDING") {
      if (order.paymentStatus === "PAID" && order.orderStatus !== "PREPARING") {
        order.orderStatus = "CONFIRMED";
      }
    }

    await order.save({ session });

    await recordAuditEventSafe(
      {
        action: "FULFILLMENT_STATUS_UPDATED",
        entityType: "FULFILLMENT",
        entityId: updatedFulfillment._id.toString(),
        status: "SUCCESS",
        metadata: {
          orderId: order._id.toString(),
          status: payload.status,
          trackingCode: payload.trackingCode || null,
        },
      },
      session
    );

    return {
      fulfillment: updatedFulfillment,
      order,
    };
  });
}
