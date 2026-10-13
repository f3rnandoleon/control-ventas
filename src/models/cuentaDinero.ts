import mongoose, { Schema, Document } from "mongoose";
import type { TipoCuentaDinero } from "@/types/cuentaDinero";

export interface ICuentaDineroDoc extends Document {
  nombre: string;
  tipo: TipoCuentaDinero;
  moneda: "BOB" | "USD";
  saldoActual: number;
  sucursalId?: mongoose.Types.ObjectId | null;
  numeroCuenta?: string | null;
  bancoNombre?: string | null;
  activa: boolean;
  esPredeterminadaPOS: boolean;
  esPredeterminadaQR: boolean;
  notas?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CuentaDineroSchema = new Schema<ICuentaDineroDoc>(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    tipo: {
      type: String,
      enum: ["CAJA_FISICA", "BANCO", "BILLETERA_QR", "PASARELA"],
      required: true,
    },
    moneda: {
      type: String,
      enum: ["BOB", "USD"],
      default: "BOB",
    },
    saldoActual: {
      type: Number,
      default: 0,
    },
    sucursalId: {
      type: Schema.Types.ObjectId,
      ref: "Sucursal",
      default: null,
      index: true,
    },
    numeroCuenta: {
      type: String,
      trim: true,
      default: null,
    },
    bancoNombre: {
      type: String,
      trim: true,
      default: null,
    },
    activa: {
      type: Boolean,
      default: true,
      index: true,
    },
    esPredeterminadaPOS: {
      type: Boolean,
      default: false,
    },
    esPredeterminadaQR: {
      type: Boolean,
      default: false,
    },
    notas: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

const CuentaDinero =
  mongoose.models.CuentaDinero ||
  mongoose.model<ICuentaDineroDoc>("CuentaDinero", CuentaDineroSchema);

export default CuentaDinero;
