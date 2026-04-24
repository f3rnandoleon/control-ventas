import { Schema, model, models, Types } from "mongoose";

const transaccionPagoSchema = new Schema(
  {
    numeroPago: {
      type: String,
      required: true,
      unique: true,
    },
    pedidoId: {
      type: Types.ObjectId,
      ref: "Pedido",
      required: true,
    },
    cliente: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    metodoPago: {
      type: String,
      enum: ["EFECTIVO", "QR"],
      required: true,
    },
    monto: {
      type: Number,
      required: true,
      min: 0,
    },
    estado: {
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
    referenciaExterna: {
      type: String,
      default: null,
    },
    motivoFallo: {
      type: String,
      default: null,
    },
    confirmadoEn: {
      type: Date,
      default: null,
    },
    falladoEn: {
      type: Date,
      default: null,
    },
    reembolsadoEn: {
      type: Date,
      default: null,
    },
    urlComprobante: {
      type: String,
      default: null,
    },
    tokenRevision: {
      type: String,
      index: {
        unique: true,
        sparse: true,
      },
    },
    tokenRevisionUsado: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

transaccionPagoSchema.index({ pedidoId: 1, createdAt: -1 });
transaccionPagoSchema.index({ cliente: 1, createdAt: -1 });
transaccionPagoSchema.index({ estado: 1, createdAt: -1 });

const TransaccionPago =
  models.TransaccionPago ||
  model("TransaccionPago", transaccionPagoSchema);

export default TransaccionPago;
