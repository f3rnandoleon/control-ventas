import { Schema, model, models, Types } from "mongoose";

const compraItemSchema = new Schema(
  {
    productoId: {
      type: Types.ObjectId,
      ref: "Producto",
      required: true,
    },
    varianteId: {
      type: String,
      required: true,
    },
    productoSnapshot: {
      nombre: { type: String, required: true },
      modelo: { type: String },
      sku: { type: String, required: true },
    },
    varianteSnapshot: {
      color: { type: String, required: true },
      colorSecundario: { type: String },
      talla: { type: String, required: true },
      codigoBarra: { type: String },
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },
    costoUnitarioOrigen: {
      type: Number,
      required: true,
      min: 0,
    },
    costoUnitarioBOB: {
      type: Number,
      required: true,
      min: 0,
    },
    totalLineaBOB: {
      type: Number,
      required: true,
      min: 0,
    },
    stockAnterior: {
      type: Number,
      required: true,
      min: 0,
    },
    costoAnteriorBOB: {
      type: Number,
      required: true,
      min: 0,
    },
    nuevoStock: {
      type: Number,
      required: true,
      min: 0,
    },
    nuevoCostoPromedioBOB: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const compraSchema = new Schema(
  {
    numeroCompra: {
      type: String,
      unique: true,
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
      required: true,
    },
    proveedor: {
      type: String,
      trim: true,
    },
    comprobanteReferencia: {
      type: String,
      trim: true,
    },
    monedaOrigen: {
      type: String,
      enum: ["PEN", "BOB", "USD"],
      default: "BOB",
      required: true,
    },
    tipoCambio: {
      type: Number,
      required: true,
      min: 0.01,
      default: 1,
    },
    totalMonedaOrigen: {
      type: Number,
      required: true,
      min: 0,
    },
    totalBOB: {
      type: Number,
      required: true,
      min: 0,
    },
    items: {
      type: [compraItemSchema],
      required: true,
      validate: [
        (val: unknown[]) => val.length > 0,
        "La compra debe tener al menos un ítem",
      ],
    },
    notas: {
      type: String,
      trim: true,
    },
    creadoPor: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

compraSchema.index({ fecha: -1 });
compraSchema.index({ creadoPor: 1 });

const Compra = models.Compra || model("Compra", compraSchema);

export default Compra;
