export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de Pago",
  CONFIRMED: "Confirmado",
  PREPARING: "En Preparación",
  READY: "Listo para Entrega",
  IN_TRANSIT: "En Camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  READY: "Listo",
  IN_TRANSIT: "Enviado",
  DELIVERED: "Entregado",
  NOT_APPLICABLE: "No Aplica",
  CANCELLED: "Cancelado",
};

export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  WHATSAPP: "📱 WhatsApp",
  PICKUP_POINT: "🏠 Punto de Encuentro",
  SHIPPING_NATIONAL: "📦 Envío Nacional",
};
