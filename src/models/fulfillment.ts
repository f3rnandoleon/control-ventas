import { Schema, model, models, Types } from "mongoose";

const fulfillmentSchema = new Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    customer: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    seller: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    channel: {
      type: String,
      enum: ["WEB", "APP_QR", "TIENDA"],
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ["WHATSAPP", "PICKUP_LAPAZ", "PICKUP_POINT", null],
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "READY", "IN_TRANSIT", "DELIVERED", "NOT_APPLICABLE", "CANCELLED"],
      default: "NOT_APPLICABLE",
      required: true,
      index: true,
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
    trackingCode: {
      type: String,
      default: null,
    },
    courierName: {
      type: String,
      default: null,
    },
    assignedTo: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },
    preparedAt: {
      type: Date,
      default: null,
    },
    inTransitAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

fulfillmentSchema.index({ status: 1, createdAt: -1 });
fulfillmentSchema.index({ customer: 1, createdAt: -1 });
fulfillmentSchema.index({ seller: 1, createdAt: -1 });
fulfillmentSchema.index({ channel: 1, createdAt: -1 });

const Fulfillment =
  models.Fulfillment || model("Fulfillment", fulfillmentSchema);

export default Fulfillment;
