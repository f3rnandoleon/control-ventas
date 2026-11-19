import { Schema, model, models, Types } from "mongoose";

const cuponSchema = new Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
      index: true,
    },
    promocionId: {
      type: Types.ObjectId,
      ref: "Promocion",
      required: true,
      index: true,
    },
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },
    usoMaximoTotal: {
      type: Number,
      min: 1,
      default: null,
    },
    usoMaximoPorCliente: {
      type: Number,
      min: 1,
      default: null,
    },
    usosActuales: {
      type: Number,
      min: 0,
      default: 0,
    },
    creadoPor: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "cupones",
  }
);

const Cupon = models.Cupon || model("Cupon", cuponSchema);
export default Cupon;
