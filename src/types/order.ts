export type OrderChannel = "WEB" | "APP_QR" | "TIENDA";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type FulfillmentStatus =
  | "PENDING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "NOT_APPLICABLE"
  | "CANCELLED";
export type StockReservationStatus =
  | "NONE"
  | "RESERVED"
  | "CONSUMED"
  | "RELEASED";

export interface OrderItem {
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
    modelo?: string;
    sku?: string;
    imagen?: string;
  };
  cantidad: number;
  precioUnitario: number;
  totalLinea: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  sourceSaleId?: string | null;
  sourceSaleNumber?: string | null;
  channel: OrderChannel;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  stockReservationStatus: StockReservationStatus;
  metodoPago: "EFECTIVO" | "QR";
  subtotal: number;
  descuento: number;
  total: number;
  items: OrderItem[];
  deliverySnapshot?: {
    method: "WHATSAPP" | "PICKUP_LAPAZ" | "PICKUP_POINT" | "SHIPPING_NATIONAL";
    pickupPoint?: "TELEFERICO_MORADO" | "TELEFERICO_ROJO" | "CORREOS" | string | null;
    address?: string | null;
    phone?: string | null;
    recipientName?: string | null;
    scheduledAt?: string | null;
    department?: string | null;
    city?: string | null;
    shippingCompany?: string | null;
    branch?: string | null;
    senderName?: string | null;
    senderCI?: string | null;
    senderPhone?: string | null;
  } | null;
  customerSnapshot?: {
    userId: string;
    fullname: string;
    email: string;
    phone?: string | null;
    documentType?: "CI" | "NIT" | "PASAPORTE" | "OTRO" | null;
    documentNumber?: string | null;
  } | null;
  customer?: {
    _id: string;
    fullname: string;
    email: string;
  };
  seller?: {
    _id: string;
    fullname: string;
    email: string;
  };
  reservedAt?: string | null;
  reservationExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrderStatusDTO {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
}
