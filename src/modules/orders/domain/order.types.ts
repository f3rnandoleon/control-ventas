import type { Types } from "mongoose";

export type CreateOrderPayload = {
    orderNumber: string;
    sourceSaleId: Types.ObjectId | string | null;
    sourceSaleNumber: string | null;
    channel: "WEB" | "APP_QR" | "TIENDA";
    orderStatus: "PENDING_PAYMENT" | "CONFIRMED" | "PREPARING" | "READY" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    fulfillmentStatus: "PENDING" | "READY" | "IN_TRANSIT" | "DELIVERED" | "NOT_APPLICABLE" | "CANCELLED";
    stockReservationStatus: "NONE" | "RESERVED" | "CONSUMED" | "RELEASED";
    reservedAt: Date | null;
    reservationExpiresAt: Date | null;
    metodoPago: "EFECTIVO" | "QR";
    customer: Types.ObjectId | string | null;
    seller: Types.ObjectId | string | null;
    customerSnapshot: Record<string, unknown> | null;
    deliverySnapshot: Record<string, unknown> | null;
    items: Array<{
        productoId: Types.ObjectId | string;
        variante: Record<string, unknown>;
        productoSnapshot: Record<string, unknown>;
        cantidad: number;
        precioUnitario: number;
        totalLinea: number;
    }>;
    subtotal: number;
    descuento: number;
    total: number;
    notes?: string | null;
};