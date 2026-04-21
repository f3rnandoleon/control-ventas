export type FulfillmentStatus =
  | "PENDING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "NOT_APPLICABLE"
  | "CANCELLED";

export type FulfillmentMethod =
  | "WHATSAPP"
  | "PICKUP_POINT"
  | null;

export interface Fulfillment {
  _id: string;
  orderId: string;
  orderNumber: string;
  customer?: string | null;
  seller?: string | null;
  channel: "WEB" | "APP_QR" | "TIENDA";
  method: FulfillmentMethod;
  status: FulfillmentStatus;
  pickupPoint?: string | null;
  address?: string | null;
  phone?: string | null;
  recipientName?: string | null;
  trackingCode?: string | null;
  courierName?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
  preparedAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFulfillmentDTO {
  orderId: string;
  trackingCode?: string | null;
  courierName?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
}

export interface UpdateFulfillmentStatusDTO {
  status: FulfillmentStatus;
  trackingCode?: string | null;
  courierName?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
}
