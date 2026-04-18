import type { Order } from "@/types/order";

type LegacyVenta = Record<string, unknown>;

function mapPaymentStatusToLegacyEstado(paymentStatus?: string) {
  if (paymentStatus === "PAID") return "PAGADA";
  if (paymentStatus === "PENDING") return "PENDIENTE";
  return "CANCELADA";
}

function mapLegacyEstadoToOrderStatus(estado?: string) {
  if (estado === "PAGADA") return "CONFIRMED";
  if (estado === "PENDIENTE") return "PENDING_PAYMENT";
  return "CANCELLED";
}

function mapLegacyEstadoToPaymentStatus(estado?: string) {
  if (estado === "PAGADA") return "PAID";
  if (estado === "PENDIENTE") return "PENDING";
  return "FAILED";
}

function sanitizeItems(items: unknown[]) {
  return items.map((item) => {
    const itemPublico = { ...(item as Record<string, unknown>) };
    delete itemPublico.precioCosto;
    delete itemPublico.ganancia;
    return itemPublico;
  });
}

export function sanitizeOrderForCustomer(order: Record<string, unknown>) {
  const items = Array.isArray(order.items) ? sanitizeItems(order.items) : [];

  return {
    _id: order._id,
    numeroPedido: order.orderNumber,
    numeroVenta: order.sourceSaleNumber || null,
    estado: mapPaymentStatusToLegacyEstado(order.paymentStatus as string),
    estadoPedido: order.orderStatus,
    estadoPago: order.paymentStatus,
    estadoEntrega: order.fulfillmentStatus,
    metodoPago: order.metodoPago,
    tipoVenta: order.channel,
    subtotal: order.subtotal,
    descuento: order.descuento,
    total: order.total,
    items,
    delivery: order.deliverySnapshot || null,
    customerSnapshot: order.customerSnapshot || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    sourceSaleId: order.sourceSaleId || null,
  };
}

export function mapLegacyVentaToCustomerOrderView(venta: LegacyVenta) {
  const items = Array.isArray(venta.items) ? sanitizeItems(venta.items) : [];

  return {
    _id: venta._id,
    numeroPedido: null,
    numeroVenta: venta.numeroVenta,
    estado: venta.estado,
    estadoPedido: mapLegacyEstadoToOrderStatus(venta.estado as string),
    estadoPago: mapLegacyEstadoToPaymentStatus(venta.estado as string),
    estadoEntrega: venta.delivery ? "PENDING" : "NOT_APPLICABLE",
    metodoPago: venta.metodoPago,
    tipoVenta: venta.tipoVenta,
    subtotal: venta.subtotal,
    descuento: venta.descuento,
    total: venta.total,
    items,
    delivery: venta.delivery || null,
    customerSnapshot: null,
    createdAt: venta.createdAt,
    updatedAt: venta.updatedAt || venta.createdAt,
    sourceSaleId: venta._id,
    legacySource: "VENTA",
  };
}

function normalizeCreatedAt(value: unknown) {
  if (typeof value === "string" || value instanceof Date) {
    return new Date(value).getTime();
  }

  return 0;
}

export function sortOrdersByCreatedAtDesc<T extends { createdAt?: unknown }>(
  orders: T[]
) {
  return [...orders].sort((a, b) => {
    const aTime = normalizeCreatedAt(a.createdAt);
    const bTime = normalizeCreatedAt(b.createdAt);
    return bTime - aTime;
  });
}

export function isCustomerOwnedOrder(
  order: Record<string, unknown>,
  customerId: string
) {
  const customer = order.customer as { _id?: string } | string | undefined;

  if (typeof customer === "string") {
    return customer === customerId;
  }

  return customer?._id === customerId;
}

export type CustomerOrderView = ReturnType<typeof sanitizeOrderForCustomer>;
export type OrderListItem = Order;
