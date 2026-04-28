import { Schema, model, models, Types } from "mongoose";

const entregaSchema = new Schema(
  {
    pedidoId: {
      type: Types.ObjectId,
      ref: "Pedido",
      required: true,
      unique: true,
    },
    numeroPedido: {
      type: String,
      required: true,
      index: true,
    },
    cliente: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    vendedor: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    canal: {
      type: String,
      enum: ["WEB", "APP_QR", "TIENDA"],
      required: true,
      index: true,
    },
    metodo: {
      type: String,
      enum: ["WHATSAPP", "PICKUP_POINT", "SHIPPING_NATIONAL", null],
      default: null,
    },
    estado: {
      type: String,
      enum: ["PENDING", "READY", "IN_TRANSIT", "DELIVERED", "NOT_APPLICABLE", "CANCELLED"],
      default: "NOT_APPLICABLE",
      required: true,
      index: true,
    },
    puntoRecojo: {
      type: String,
      default: null,
    },
    direccion: {
      type: String,
      default: null,
    },
    telefono: {
      type: String,
      default: null,
    },
    nombreDestinatario: {
      type: String,
      default: null,
    },
    codigoSeguimiento: {
      type: String,
      default: null,
    },
    nombreTransportista: {
      type: String,
      default: null,
    },
    asignadoA: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    notas: {
      type: String,
      default: null,
    },
    preparadoEn: {
      type: Date,
      default: null,
    },
    enTransitoEn: {
      type: Date,
      default: null,
    },
    entregadoEn: {
      type: Date,
      default: null,
    },
    canceladoEn: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

entregaSchema.index({ estado: 1, createdAt: -1 });
entregaSchema.index({ cliente: 1, createdAt: -1 });
entregaSchema.index({ vendedor: 1, createdAt: -1 });
entregaSchema.index({ canal: 1, createdAt: -1 });

const Entrega =
  models.Entrega || model("Entrega", entregaSchema);

export default Entrega;
