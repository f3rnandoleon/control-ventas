import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";
import Venta from "@/models/venta";
import { getValidatedCartForCheckout, clearCartByUserId } from "@/modules/cart/application/cart.service";
import {
  getCustomerAddressByUserId,
  getCustomerContextByUserId,
} from "@/modules/customers/application/customers.service";
import {
  getAvailableStockForVariant,
  releaseReservedStockForOrder,
  reserveStockForOrder,
} from "@/modules/inventory/application/inventory.service";
import { ordersRepository } from "@/modules/orders/infrastructure/orders.repository";
import {
  mapLegacyVentaToCustomerOrderView,
  sanitizeOrderForCustomer,
  sortOrdersByCreatedAtDesc,
} from "@/modules/orders/domain/order.utils";
import { syncFulfillmentForOrder } from "@/modules/fulfillment/application/fulfillment.service";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { AppError } from "@/shared/errors/AppError";
import { runInTransaction } from "@/shared/db/runTransaction";
import type { CheckoutCartInput } from "@/schemas/cart.schema";
import type { UpdateOrderStatusInput } from "@/schemas/order.schema";

type OrderItemInput = {
  productoId: string;
  variante: {
    variantId?: string;
    color: string;
    colorSecundario?: string;
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
};

type CreateOrderFromSaleInput = {
  saleId: string;
  saleNumber: string;
  items: OrderItemInput[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: "EFECTIVO" | "QR";
  channel: "WEB" | "APP_QR" | "TIENDA";
  saleStatus: "PAGADA" | "PENDIENTE" | "CANCELADA";
  customerId?: string;
  sellerId?: string;
  delivery?: {
    method: "WHATSAPP" | "PICKUP_LAPAZ" | "HOME_DELIVERY";
    pickupPoint?: "TELEFERICO_MORADO" | "TELEFERICO_ROJO" | "CORREOS" | null;
    address?: string | null;
    phone?: string | null;
  };
};

function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

function createOrderNumber() {
  return `O-${Date.now()}`;
}

function mapSaleStatusToOrderState(saleStatus: CreateOrderFromSaleInput["saleStatus"]) {
  if (saleStatus === "PENDIENTE") {
    return {
      orderStatus: "PENDING_PAYMENT" as const,
      paymentStatus: "PENDING" as const,
    };
  }

  if (saleStatus === "CANCELADA") {
    return {
      orderStatus: "CANCELLED" as const,
      paymentStatus: "FAILED" as const,
    };
  }

  return {
    orderStatus: "CONFIRMED" as const,
    paymentStatus: "PAID" as const,
  };
}

function mapFulfillmentStatus(
  channel: CreateOrderFromSaleInput["channel"],
  delivery?: CreateOrderFromSaleInput["delivery"]
) {
  if (channel === "TIENDA" && !delivery) {
    return "NOT_APPLICABLE" as const;
  }

  if (!delivery) {
    return "PENDING" as const;
  }

  return delivery.method === "WHATSAPP" ? "NOT_APPLICABLE" : "PENDING";
}

function createReservationExpirationDate(minutes = 15) {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + minutes);
  return expiration;
}

async function releaseOrderReservation(order: {
  _id?: string | mongoose.Types.ObjectId;
  items: Array<{
    productoId: string | mongoose.Types.ObjectId;
    variante: {
      variantId?: string;
      color: string;
      colorSecundario?: string;
      talla: string;
    };
    cantidad: number;
  }>;
}, session?: mongoose.ClientSession) {
  for (const item of order.items) {
    const producto = await Producto.findById(item.productoId).session(
      session ?? null
    );

    if (!producto) {
      continue;
    }

    const variante = producto.variantes.find((candidate: {
      variantId?: string;
      color: string;
      colorSecundario?: string;
      talla: string;
    }) => {
      if (item.variante.variantId && candidate.variantId) {
        return candidate.variantId === item.variante.variantId;
      }

      return (
        candidate.color === item.variante.color &&
        (item.variante.colorSecundario === undefined ||
          (candidate.colorSecundario || "") ===
            (item.variante.colorSecundario || "")) &&
        candidate.talla === item.variante.talla
      );
    });

    if (!variante) {
      continue;
    }

    await releaseReservedStockForOrder({
      producto,
      variante,
      cantidad: item.cantidad,
    }, session);
  }
}

export async function releaseExpiredReservations(limit = 100) {
  await connectDB();
  const expiredOrders = await ordersRepository.findExpiredReserved(limit);
  let releasedCount = 0;

  for (const expiredOrder of expiredOrders) {
    const wasReleased = await runInTransaction(async (session) => {
      const order = await ordersRepository.findById(
        expiredOrder._id.toString(),
        session
      );

      if (
        !order ||
        order.stockReservationStatus !== "RESERVED" ||
        !order.reservationExpiresAt ||
        order.reservationExpiresAt >= new Date()
      ) {
        return false;
      }

      await releaseOrderReservation(order, session);

      order.stockReservationStatus = "RELEASED";
      order.orderStatus = "CANCELLED";
      order.paymentStatus = "FAILED";
      order.fulfillmentStatus = "CANCELLED";
      order.reservedAt = null;
      order.reservationExpiresAt = null;
      await order.save({ session });

      return true;
    });

    if (wasReleased) {
      releasedCount += 1;
    }
  }

  return releasedCount;
}

export async function createOrderFromSale(
  input: CreateOrderFromSaleInput,
  options?: { session?: mongoose.ClientSession }
) {
  await connectDB();

  const { orderStatus, paymentStatus } = mapSaleStatusToOrderState(
    input.saleStatus
  );

  let customerSnapshot: Record<string, unknown> | null = null;
  let deliverySnapshot: Record<string, unknown> | null = input.delivery
    ? {
        ...input.delivery,
      }
    : null;

  if (input.customerId) {
    const customer = await getCustomerContextByUserId(input.customerId, {
      ensureProfile: true,
    });

    customerSnapshot = {
      userId: customer.user._id,
      fullname: customer.user.fullname,
      email: customer.user.email,
      phone:
        input.delivery?.phone ||
        customer.profile?.phone ||
        customer.defaultAddress?.phone ||
        null,
      documentType: customer.profile?.documentType || null,
      documentNumber: customer.profile?.documentNumber || null,
    };

    if (deliverySnapshot) {
      deliverySnapshot = {
        ...deliverySnapshot,
        recipientName: customer.user.fullname,
      };
    } else if (customer.defaultAddress) {
      deliverySnapshot = {
        method: "HOME_DELIVERY",
        address: customer.defaultAddress.addressLine,
        phone: customer.defaultAddress.phone,
        recipientName: customer.defaultAddress.recipientName,
      };
    }
  }

  return ordersRepository.create({
    orderNumber: createOrderNumber(),
    sourceSaleId: input.saleId,
    sourceSaleNumber: input.saleNumber,
    channel: input.channel,
    orderStatus,
    paymentStatus,
    fulfillmentStatus: mapFulfillmentStatus(input.channel, input.delivery),
    stockReservationStatus: "NONE",
    reservedAt: null,
    reservationExpiresAt: null,
    metodoPago: input.metodoPago,
    customer: input.customerId || null,
    seller: input.sellerId || null,
    customerSnapshot,
    deliverySnapshot,
    items: input.items.map((item) => ({
      ...item,
      totalLinea: item.cantidad * item.precioUnitario,
    })),
    subtotal: input.subtotal,
    descuento: input.descuento,
    total: input.total,
  }, options?.session).then(async (order) => {
    await syncFulfillmentForOrder(order, options?.session);
    return order;
  });
}

export async function checkoutCartToOrder(
  customerId: string,
  payload: CheckoutCartInput
) {
  assertObjectId(customerId, "Usuario no valido");
  await connectDB();

  await releaseExpiredReservations();
  const customer = await getCustomerContextByUserId(customerId, {
    ensureProfile: true,
  });

  const method = payload.delivery?.method ?? null;
  let deliverySnapshot: Record<string, unknown> | null = null;

  if (method === "WHATSAPP") {
    // Sin dirección, solo se coordina por WhatsApp
    deliverySnapshot = { method: "WHATSAPP" };
  } else if (method === "HOME_DELIVERY") {
    deliverySnapshot = {
      method: "HOME_DELIVERY",
      address: payload.delivery?.address ?? null,
      phone: payload.delivery?.phone ?? null,
      recipientName: payload.delivery?.recipientName || customer.user.fullname,
      scheduledAt: payload.delivery?.scheduledAt ?? null,
    };
  } else if (method === "SHIPPING_NATIONAL") {
    deliverySnapshot = {
      method: "SHIPPING_NATIONAL",
      department: payload.delivery?.department ?? null,
      city: payload.delivery?.city ?? null,
      shippingCompany: payload.delivery?.shippingCompany ?? null,
      branch: payload.delivery?.branch ?? null,
      senderName: payload.delivery?.senderName ?? null,
      senderCI: payload.delivery?.senderCI ?? null,
      senderPhone: payload.delivery?.senderPhone ?? null,
      recipientName: payload.delivery?.recipientName || customer.user.fullname,
    };
  } else if (payload.addressId) {
    // Compatibilidad con flujo anterior via addressId
    const address = await getCustomerAddressByUserId(customerId, payload.addressId);
    deliverySnapshot = {
      method: "HOME_DELIVERY",
      address: payload.delivery?.address || address.addressLine,
      phone: payload.delivery?.phone || address.phone,
      recipientName: payload.delivery?.recipientName || address.recipientName,
    };
  } else if (customer.defaultAddress) {
    deliverySnapshot = {
      method: "HOME_DELIVERY",
      address: customer.defaultAddress.addressLine,
      phone: customer.defaultAddress.phone,
      recipientName: customer.defaultAddress.recipientName,
    };
  }

  // WhatsApp necesita más tiempo (confirmación manual)
  const reservationMinutes = method === "WHATSAPP" ? 60 * 24 : 30;

  return runInTransaction(async (session) => {
    const { validatedItems } = await getValidatedCartForCheckout(
      customerId,
      session
    );
    const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal;

    for (const { producto, variante, cartItem } of validatedItems) {
      if (getAvailableStockForVariant(variante) < cartItem.cantidad) {
        throw new AppError(
          `Stock insuficiente para ${producto.nombre} ${variante.color}/${variante.talla}`,
          400
        );
      }

      await reserveStockForOrder(
        {
          producto,
          variante,
          cantidad: cartItem.cantidad,
        },
        session
      );
    }

    const fulfillmentStatus =
      method === "WHATSAPP" ? "NOT_APPLICABLE" : "PENDING";

    const order = await ordersRepository.create({
      orderNumber: createOrderNumber(),
      sourceSaleId: null,
      sourceSaleNumber: null,
      channel: "WEB",
      orderStatus: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      fulfillmentStatus,
      stockReservationStatus: "RESERVED",
      reservedAt: new Date(),
      reservationExpiresAt: createReservationExpirationDate(reservationMinutes),
      metodoPago: payload.metodoPago,
      customer: customerId,
      seller: null,
      customerSnapshot: {
        userId: customer.user._id,
        fullname: customer.user.fullname,
        email: customer.user.email,
        phone:
          (deliverySnapshot?.phone as string) ||
          customer.profile?.phone ||
          customer.defaultAddress?.phone ||
          null,
        documentType: customer.profile?.documentType || null,
        documentNumber: customer.profile?.documentNumber || null,
      },
      deliverySnapshot,
      items: validatedItems.map(
        ({ producto, variante, cartItem, precioUnitario }) => ({
          productoId: producto._id,
          variante: {
            variantId: variante.variantId,
            color: variante.color,
            colorSecundario: variante.colorSecundario,
            talla: variante.talla,
            codigoBarra: variante.codigoBarra,
            qrCode: variante.qrCode,
          },
          productoSnapshot: {
            nombre: producto.nombre,
            modelo: producto.modelo,
            sku: producto.sku,
            imagen: cartItem.productoSnapshot.imagen,
          },
          cantidad: cartItem.cantidad,
          precioUnitario,
          totalLinea: precioUnitario * cartItem.cantidad,
        })
      ),
      subtotal,
      descuento: 0,
      total,
    }, session);

    await syncFulfillmentForOrder(order, session);

    await clearCartByUserId(customerId, session);

    await recordAuditEventSafe(
      {
        action: "ORDER_CHECKOUT",
        entityType: "ORDER",
        entityId: order._id.toString(),
        actorId: customerId,
        actorRole: "CLIENTE",
        status: "SUCCESS",
        metadata: {
          channel: order.channel,
          deliveryMethod: method,
          total: order.total,
          items: order.items.length,
        },
      },
      session
    );

    return order;
  });
}

export async function listOrdersForActor(role: string, userId: string) {
  await connectDB();
  await releaseExpiredReservations();

  if (role === "CLIENTE") {
    return ordersRepository.listByCustomer(userId);
  }

  if (["ADMIN", "VENDEDOR"].includes(role)) {
    return ordersRepository.listAll();
  }

  throw new AppError("No autorizado", 403);
}

export async function getOrderForActor(role: string, userId: string, id: string) {
  assertObjectId(id, "ID de pedido invalido");
  await connectDB();
  await releaseExpiredReservations();

  const order =
    role === "CLIENTE"
      ? await ordersRepository.findByIdForCustomer(id, userId)
      : await ordersRepository.findById(id);

  if (!order) {
    throw new AppError("Pedido no encontrado", 404);
  }

  return order;
}

export async function updateOrderStatusForStaff(
  id: string,
  payload: UpdateOrderStatusInput
) {
  assertObjectId(id, "ID de pedido invalido");
  await connectDB();
  await releaseExpiredReservations();

  return runInTransaction(async (session) => {
    const currentOrder = await ordersRepository.findById(id, session);

    if (!currentOrder) {
      throw new AppError("Pedido no encontrado", 404);
    }

    const nextPayload: Record<string, unknown> = { ...payload };

    if (payload.orderStatus === "CANCELLED") {
      if (!payload.fulfillmentStatus) {
        nextPayload.fulfillmentStatus = "CANCELLED";
      }

      if (
        currentOrder.stockReservationStatus === "RESERVED" &&
        currentOrder.paymentStatus !== "PAID"
      ) {
        await releaseOrderReservation(currentOrder, session);
        nextPayload.stockReservationStatus = "RELEASED";
        nextPayload.paymentStatus = payload.paymentStatus || "FAILED";
        nextPayload.reservedAt = null;
        nextPayload.reservationExpiresAt = null;
      }
    }

    Object.assign(currentOrder, nextPayload);
    await currentOrder.save({ session });
    await syncFulfillmentForOrder(currentOrder, session);

    await recordAuditEventSafe(
      {
        action: "ORDER_STATUS_UPDATED",
        entityType: "ORDER",
        entityId: currentOrder._id.toString(),
        status: "SUCCESS",
        metadata: {
          orderStatus: currentOrder.orderStatus,
          paymentStatus: currentOrder.paymentStatus,
          fulfillmentStatus: currentOrder.fulfillmentStatus,
        },
      },
      session
    );

    return currentOrder;
  });
}

export async function listCustomerOrdersWithLegacyFallback(customerId: string) {
  assertObjectId(customerId, "Usuario no valido");
  await connectDB();
  await releaseExpiredReservations();

  const orders = await ordersRepository.listByCustomer(customerId);
  const sourceSaleIds = orders
    .map((order) => order.sourceSaleId?.toString())
    .filter((value): value is string => Boolean(value));

  const legacyVentas = await Venta.find({
    cliente: customerId,
    ...(sourceSaleIds.length > 0 ? { _id: { $nin: sourceSaleIds } } : {}),
  })
    .populate("items.productoId", "nombre modelo sku precioVenta")
    .sort({ createdAt: -1 })
    .lean();

  return sortOrdersByCreatedAtDesc([
    ...orders.map((order) =>
      sanitizeOrderForCustomer(order.toObject() as Record<string, unknown>)
    ),
    ...(legacyVentas as Record<string, unknown>[]).map(mapLegacyVentaToCustomerOrderView),
  ]);
}

export async function getCustomerOrderWithLegacyFallback(
  customerId: string,
  id: string
) {
  assertObjectId(customerId, "Usuario no valido");
  assertObjectId(id, "ID de pedido invalido");
  await connectDB();
  await releaseExpiredReservations();

  const order = await ordersRepository.findByIdForCustomer(id, customerId);

  if (order) {
    return sanitizeOrderForCustomer(order.toObject() as Record<string, unknown>);
  }

  const legacyVenta = await Venta.findOne({ _id: id, cliente: customerId })
    .populate("items.productoId", "nombre modelo sku precioVenta")
    .lean();

  if (!legacyVenta) {
    throw new AppError("Pedido no encontrado", 404);
  }

  return mapLegacyVentaToCustomerOrderView(legacyVenta as Record<string, unknown>);
}
