import mongoose, { Schema, Document } from "mongoose";

export interface ICierrePeriodoDoc extends Document {
  anio: number;
  mes: number;
  mesNombre: string;
  bloqueado: boolean;
  cerradoPor: mongoose.Types.ObjectId;
  fechaCierre: Date;
  utilidadNetaAlCierre?: number;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CierrePeriodoSchema = new Schema<ICierrePeriodoDoc>(
  {
    anio: { type: Number, required: true },
    mes: { type: Number, required: true, min: 1, max: 12 },
    mesNombre: { type: String, required: true },
    bloqueado: { type: Boolean, default: true },
    cerradoPor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fechaCierre: { type: Date, default: Date.now },
    utilidadNetaAlCierre: { type: Number, default: 0 },
    observaciones: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "cierres_periodos",
  }
);

CierrePeriodoSchema.index({ anio: 1, mes: 1 }, { unique: true });

export default mongoose.models.CierrePeriodo ||
  mongoose.model<ICierrePeriodoDoc>("CierrePeriodo", CierrePeriodoSchema);
