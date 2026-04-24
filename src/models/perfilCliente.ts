import { Schema, model, models, Types } from "mongoose";

const perfilClienteSchema = new Schema(
  {
    usuarioId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    telefono: {
      type: String,
      trim: true,
      default: null,
    },
    tipoDocumento: {
      type: String,
      enum: ["CI", "NIT", "PASAPORTE", "OTRO", null],
      default: null,
    },
    numeroDocumento: {
      type: String,
      trim: true,
      default: null,
    },
    metodoEntregaPredeterminado: {
      type: String,
      enum: ["WHATSAPP", "PICKUP_POINT", "SHIPPING_NATIONAL", null],
      default: null,
    },
    notas: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PerfilCliente =
  models.PerfilCliente ||
  model("PerfilCliente", perfilClienteSchema);

export default PerfilCliente;
