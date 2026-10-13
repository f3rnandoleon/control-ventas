import mongoose, { Schema, Document } from "mongoose";

export interface IDevolucionCambioDoc extends Document {
  numeroOperacion: string;
  pedidoId: mongoose.Types.ObjectId;
  numeroPedido: string;
  sucursalId: mongoose.Types.ObjectId;
  tipo: "DEVOLUCION" | "CAMBIO";
  itemsDevueltos: Array<{
    productoId: mongoose.Types.ObjectId;
    varianteId: string;
    nombre: string;
    color: string;
    talla: string;
    cantidad: number;
    precioUnitario: number;
    precioCosto: number;
    subtotal: number;
    destinoFisico: "REINGRESO_STOCK" | "MERMA_DANADO";
    motivo: string;
  }>;
  itemsEntregados: Array<{
    productoId: mongoose.Types.ObjectId;
    varianteId: string;
    nombre: string;
    color: string;
    talla: string;
    cantidad: number;
    precioUnitario: number;
    precioCosto: number;
    subtotal: number;
  }>;
  montoDevolucion: number;
  montoEntregado: number;
  diferenciaMonto: number;
  accionMonetaria: "REEMBOLSO_CLIENTE" | "COBRO_ADICIONAL" | "NINGUNO";
  cuentaDineroId?: mongoose.Types.ObjectId | null;
  usuarioId: mongoose.Types.ObjectId;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ItemDevueltoSchema = new Schema(
  {
    productoId: { type: Schema.Types.ObjectId, ref: "Producto", required: true },
    varianteId: { type: String, required: true },
    nombre: { type: String, required: true },
    color: { type: String, default: "" },
    talla: { type: String, default: "" },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0 },
    precioCosto: { type: Number, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    destinoFisico: {
      type: String,
      enum: ["REINGRESO_STOCK", "MERMA_DANADO"],
      required: true,
      default: "REINGRESO_STOCK",
    },
    motivo: { type: String, required: true },
  },
  { _id: false }
);

const ItemEntregadoSchema = new Schema(
  {
    productoId: { type: Schema.Types.ObjectId, ref: "Producto", required: true },
    varianteId: { type: String, required: true },
    nombre: { type: String, required: true },
    color: { type: String, default: "" },
    talla: { type: String, default: "" },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0 },
    precioCosto: { type: Number, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const DevolucionCambioSchema = new Schema<IDevolucionCambioDoc>(
  {
    numeroOperacion: { type: String, required: true, unique: true, index: true },
    pedidoId: { type: Schema.Types.ObjectId, ref: "Pedido", required: true, index: true },
    numeroPedido: { type: String, required: true },
    sucursalId: { type: Schema.Types.ObjectId, ref: "Sucursal", required: true, index: true },
    tipo: { type: String, enum: ["DEVOLUCION", "CAMBIO"], required: true },
    itemsDevueltos: [ItemDevueltoSchema],
    itemsEntregados: { type: [ItemEntregadoSchema], default: [] },
    montoDevolucion: { type: Number, required: true, default: 0 },
    montoEntregado: { type: Number, required: true, default: 0 },
    diferenciaMonto: { type: Number, required: true, default: 0 },
    accionMonetaria: {
      type: String,
      enum: ["REEMBOLSO_CLIENTE", "COBRO_ADICIONAL", "NINGUNO"],
      required: true,
      default: "NINGUNO",
    },
    cuentaDineroId: { type: Schema.Types.ObjectId, ref: "CuentaDinero", default: null },
    usuarioId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    observaciones: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "devoluciones_cambios",
  }
);

DevolucionCambioSchema.index({ createdAt: -1 });

export default mongoose.models.DevolucionCambio ||
  mongoose.model<IDevolucionCambioDoc>("DevolucionCambio", DevolucionCambioSchema);
