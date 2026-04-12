import { Schema, model, models, Types } from "mongoose";

const orderItemSchema = new Schema(
  {
    productoId: {
      type: Types.ObjectId,
      ref: "Producto",
      required: true,
    },
    variante: {
      variantId: { type: String, index: true },
      color: { type: String, required: true },
      colorSecundario: { type: String, trim: true },
      talla: { type: String, required: true },
      codigoBarra: { type: String },
      qrCode: { type: String },
    },
    productoSnapshot: {
      nombre: { type: String, required: true },
      modelo: { type: String },
      sku: { type: String },
      imagen: { type: String },
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },
    precioUnitario: {
      type: Number,
      required: true,
      min: 0,
    },
    totalLinea: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    sourceSaleId: {
      type: Types.ObjectId,
      ref: "Venta",
      default: null,
      index: true,
    },
    sourceSaleNumber: {
      type: String,
      default: null,
    },
    channel: {
      type: String,
      enum: ["WEB", "APP_QR", "TIENDA"],
      required: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "CONFIRMED",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PAID",
      required: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ["PENDING", "READY", "IN_TRANSIT", "DELIVERED", "NOT_APPLICABLE", "CANCELLED"],
      default: "NOT_APPLICABLE",
      required: true,
    },
    stockReservationStatus: {
      type: String,
      enum: ["NONE", "RESERVED", "CONSUMED", "RELEASED"],
      default: "NONE",
      required: true,
    },
    reservedAt: {
      type: Date,
      default: null,
    },
    reservationExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    metodoPago: {
      type: String,
      enum: ["EFECTIVO", "QR"],
      required: true,
    },
    customer: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    seller: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    customerSnapshot: {
      userId: { type: Types.ObjectId, ref: "User" },
      fullname: { type: String },
      email: { type: String },
      phone: { type: String, default: null },
      documentType: {
        type: String,
        enum: ["CI", "NIT", "PASAPORTE", "OTRO", null],
        default: null,
      },
      documentNumber: { type: String, default: null },
    },
    deliverySnapshot: {
      method: {
        type: String,
        enum: ["WHATSAPP", "PICKUP_LAPAZ", "HOME_DELIVERY", null],
        default: null,
      },
      pickupPoint: {
        type: String,
        enum: ["TELEFERICO_MORADO", "TELEFERICO_ROJO", "CORREOS", null],
        default: null,
      },
      address: {
        type: String,
        default: null,
      },
      phone: {
        type: String,
        default: null,
      },
      recipientName: {
        type: String,
        default: null,
      },
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    descuento: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ channel: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ fulfillmentStatus: 1, createdAt: -1 });
orderSchema.index({ stockReservationStatus: 1, reservationExpiresAt: 1 });

const Order = models.Order || model("Order", orderSchema);
export default Order;
