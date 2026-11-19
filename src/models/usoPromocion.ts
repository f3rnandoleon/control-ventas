import { Schema, model, models, Types } from "mongoose";

const usoPromocionSchema = new Schema(
  {
    promocionId: {
      type: Types.ObjectId,
      ref: "Promocion",
      required: true,
      index: true,
    },
    cuponId: {
      type: Types.ObjectId,
      ref: "Cupon",
      default: null,
      index: true,
    },
    codigoCupon: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    pedidoId: {
      type: Types.ObjectId,
      ref: "Pedido",
      required: true,
      index: true,
    },
    clienteId: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    telefonoInvitado: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    montoDescontado: {
      type: Number,
      min: 0,
      required: true,
    },
    estado: {
      type: String,
      enum: ["RESERVADO", "APLICADO", "REVERTIDO"],
      default: "RESERVADO",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "usos_promociones",
  }
);

usoPromocionSchema.index({ pedidoId: 1, promocionId: 1 }, { unique: true });
usoPromocionSchema.index({ promocionId: 1, clienteId: 1, estado: 1 });
usoPromocionSchema.index({ promocionId: 1, telefonoInvitado: 1, estado: 1 });
usoPromocionSchema.index({ cuponId: 1, clienteId: 1, estado: 1 });
usoPromocionSchema.index({ cuponId: 1, telefonoInvitado: 1, estado: 1 });

const UsoPromocion = models.UsoPromocion || model("UsoPromocion", usoPromocionSchema);
export default UsoPromocion;
