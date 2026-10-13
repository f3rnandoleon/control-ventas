import mongoose, { Schema, Document } from "mongoose";
import type { CategoriaGasto, NaturalezaGasto } from "@/types/gasto";

export interface IGastoDoc extends Document {
  numeroGasto: string;
  fecha: Date;
  categoria: CategoriaGasto;
  naturaleza: NaturalezaGasto;
  monto: number;
  descripcion: string;
  beneficiarioProveedor?: string | null;
  comprobanteUrl?: string | null;
  cuentaDineroId: mongoose.Types.ObjectId;
  sucursalId?: mongoose.Types.ObjectId | null;
  creadoPor: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GastoSchema = new Schema<IGastoDoc>(
  {
    numeroGasto: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
      index: true,
    },
    categoria: {
      type: String,
      enum: [
        "PUBLICIDAD_MARKETING",
        "EMPAQUES_BOLSAS",
        "ALQUILER_TIENDA",
        "SUELDOS_COMISIONES",
        "SERVICIOS_BASICOS",
        "TRANSPORTE_ENVIOS",
        "MANTENIMIENTO_LIMPIEZA",
        "OTROS",
      ],
      required: true,
      index: true,
    },
    naturaleza: {
      type: String,
      enum: ["FIJO", "VARIABLE"],
      required: true,
      index: true,
    },
    monto: {
      type: Number,
      required: true,
      min: 0.01,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    beneficiarioProveedor: {
      type: String,
      trim: true,
      default: null,
    },
    comprobanteUrl: {
      type: String,
      trim: true,
      default: null,
    },
    cuentaDineroId: {
      type: Schema.Types.ObjectId,
      ref: "CuentaDinero",
      required: true,
      index: true,
    },
    sucursalId: {
      type: Schema.Types.ObjectId,
      ref: "Sucursal",
      default: null,
      index: true,
    },
    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Gasto =
  mongoose.models.Gasto ||
  mongoose.model<IGastoDoc>("Gasto", GastoSchema);

export default Gasto;
