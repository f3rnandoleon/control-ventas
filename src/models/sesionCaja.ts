import mongoose, { Schema, Document } from "mongoose";
import type { EstadoSesionCaja, MovimientoManualCaja } from "@/types/sesionCaja";

export interface ISesionCajaDoc extends Document {
  sucursalId: mongoose.Types.ObjectId;
  cuentaDineroId: mongoose.Types.ObjectId;
  usuarioAperturaId: mongoose.Types.ObjectId;
  usuarioCierreId?: mongoose.Types.ObjectId | null;
  fechaApertura: Date;
  fechaCierre?: Date | null;
  montoApertura: number;
  totalVentasEfectivo: number;
  totalVentasQR: number;
  totalVentasTarjeta: number;
  totalIngresosManuales: number;
  totalEgresosManuales: number;
  montoEsperadoEfectivo: number;
  montoDeclaradoEfectivo?: number | null;
  diferenciaEfectivo?: number | null;
  movimientosManuales: MovimientoManualCaja[];
  estado: EstadoSesionCaja;
  notasApertura?: string | null;
  notasCierre?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MovimientoManualSchema = new Schema(
  {
    tipo: { type: String, enum: ["INGRESO", "EGRESO"], required: true },
    monto: { type: Number, required: true },
    motivo: { type: String, required: true, trim: true },
    hora: { type: String, required: true },
  },
  { _id: false }
);

const SesionCajaSchema = new Schema<ISesionCajaDoc>(
  {
    sucursalId: {
      type: Schema.Types.ObjectId,
      ref: "Sucursal",
      required: true,
      index: true,
    },
    cuentaDineroId: {
      type: Schema.Types.ObjectId,
      ref: "CuentaDinero",
      required: true,
    },
    usuarioAperturaId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    usuarioCierreId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    fechaApertura: {
      type: Date,
      default: Date.now,
    },
    fechaCierre: {
      type: Date,
      default: null,
    },
    montoApertura: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalVentasEfectivo: {
      type: Number,
      default: 0,
    },
    totalVentasQR: {
      type: Number,
      default: 0,
    },
    totalVentasTarjeta: {
      type: Number,
      default: 0,
    },
    totalIngresosManuales: {
      type: Number,
      default: 0,
    },
    totalEgresosManuales: {
      type: Number,
      default: 0,
    },
    montoEsperadoEfectivo: {
      type: Number,
      default: 0,
    },
    montoDeclaradoEfectivo: {
      type: Number,
      default: null,
    },
    diferenciaEfectivo: {
      type: Number,
      default: null,
    },
    movimientosManuales: [MovimientoManualSchema],
    estado: {
      type: String,
      enum: ["ABIERTA", "CERRADA"],
      default: "ABIERTA",
      index: true,
    },
    notasApertura: {
      type: String,
      trim: true,
      default: null,
    },
    notasCierre: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Índice compuesto para consultar rápidamente si una sucursal tiene sesión abierta
SesionCajaSchema.index({ sucursalId: 1, estado: 1 });

const SesionCaja =
  mongoose.models.SesionCaja ||
  mongoose.model<ISesionCajaDoc>("SesionCaja", SesionCajaSchema);

export default SesionCaja;
