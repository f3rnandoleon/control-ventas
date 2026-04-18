import { Schema, model, models, Types } from "mongoose";

const paymentTransactionSchema = new Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customer: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    metodoPago: {
      type: String,
      enum: ["EFECTIVO", "QR"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      required: true,
    },
    idempotencyKey: {
      type: String,
      default: undefined,
      index: {
        unique: true,
        sparse: true,
      },
    },
    externalReference: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    comprobanteUrl: {
      type: String,
      default: null,
    },
    reviewToken: {
      type: String,
      index: {
        unique: true,
        sparse: true,
      },
    },
    reviewTokenUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

paymentTransactionSchema.index({ orderId: 1, createdAt: -1 });
paymentTransactionSchema.index({ customer: 1, createdAt: -1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });

const PaymentTransaction =
  models.PaymentTransaction ||
  model("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;
