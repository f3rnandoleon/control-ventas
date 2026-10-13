import mongoose, { Schema, Document } from "mongoose";
import type { TipoMovimientoCuenta, OrigenMovimientoCuenta } from "@/types/movimientoCuenta";

export interface IMovimientoCuentaDoc extends Document {
  cuentaId: mongoose.Types.ObjectId;
  cuentaContraparteId?: mongoose.Types.ObjectId | null;
  tipo: TipoMovimientoCuenta;
  monto: number;
  saldoAnterior: number;
  saldoPosterior: number;
  concepto: string;
  origenTipo: OrigenMovimientoCuenta;
  origenId?: mongoose.Types.ObjectId | string | null;
  sucursalId?: mongoose.Types.ObjectId | null;
  usuarioId: mongoose.Types.ObjectId;
  comprobanteUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MovimientoCuentaSchema = new Schema<IMovimientoCuentaDoc>(
  {
    cuentaId: {
      type: Schema.Types.ObjectId,
      ref: "CuentaDinero",
      required: true,
      index: true,
    },
    cuentaContraparteId: {
      type: Schema.Types.ObjectId,
      ref: "CuentaDinero",
      default: null,
    },
    tipo: {
      type: String,
      enum: ["INGRESO", "EGRESO", "TRANSFERENCIA"],
      required: true,
    },
    monto: {
      type: Number,
      required: true,
      min: 0.01,
    },
    saldoAnterior: {
      type: Number,
      required: true,
    },
    saldoPosterior: {
      type: Number,
      required: true,
    },
    concepto: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    origenTipo: {
      type: String,
      enum: [
        "VENTA_PEDIDO",
        "COMPRA",
        "GASTO",
        "REEMBOLSO_DEVOLUCION",
        "COBRO_DEVOLUCION",
        "AJUSTE_ARQUEO",
        "TRASLADO_ENTRE_CUENTAS",
        "SALDO_INICIAL",
      ],
      required: true,
      index: true,
    },
    origenId: {
      type: Schema.Types.Mixed,
      default: null,
      index: true,
    },
    sucursalId: {
      type: Schema.Types.ObjectId,
      ref: "Sucursal",
      default: null,
      index: true,
    },
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comprobanteUrl: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

const MovimientoCuenta =
  mongoose.models.MovimientoCuenta ||
  mongoose.model<IMovimientoCuentaDoc>("MovimientoCuenta", MovimientoCuentaSchema);

export default MovimientoCuenta;
