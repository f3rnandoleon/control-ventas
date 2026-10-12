import { Schema, model, models, Types } from "mongoose";
import { estadoTraspasoValues } from "@/types/traspaso";

const traspasoItemSchema = new Schema(
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
      sku: { type: String, required: true },
      modelo: { type: String },
    },
    varianteSnapshot: {
      color: { type: String, required: true },
      colorSecundario: { type: String },
      talla: { type: String, required: true },
      codigoBarra: { type: String },
      imagen: { type: String },
    },
    cantidadEnviada: {
      type: Number,
      required: true,
      min: 1,
    },
    cantidadRecibida: {
      type: Number,
      default: 0,
      min: 0,
    },
    costoUnitarioCPP: {
      type: Number,
      required: true,
      min: 0,
    },
    notasItem: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const traspasoSchema = new Schema(
  {
    numeroTraspaso: {
      type: String,
      required: true,
      unique: true,
    },
    sucursalOrigenId: {
      type: Types.ObjectId,
      ref: "Sucursal",
      required: true,
      index: true,
    },
    sucursalDestinoId: {
      type: Types.ObjectId,
      ref: "Sucursal",
      required: true,
      index: true,
    },
    estado: {
      type: String,
      enum: estadoTraspasoValues,
      default: "SOLICITADA",
      required: true,
      index: true,
    },
    items: {
      type: [traspasoItemSchema],
      required: true,
      validate: [
        (val: unknown[]) => val.length > 0,
        "El traspaso debe contener al menos un ítem",
      ],
    },
    totalPrendasEnviadas: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrendasRecibidas: {
      type: Number,
      default: 0,
      min: 0,
    },
    valorTotalCostoTraspaso: {
      type: Number,
      required: true,
      min: 0,
    },
    solicitadoPor: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    despachadoPor: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    recibidoPor: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    fechaDespacho: {
      type: Date,
      default: null,
    },
    fechaRecepcion: {
      type: Date,
      default: null,
    },
    motivo: {
      type: String,
      default: "Reabastecimiento de tienda",
      trim: true,
    },
    notas: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

traspasoSchema.index({ sucursalOrigenId: 1, estado: 1 });
traspasoSchema.index({ sucursalDestinoId: 1, estado: 1 });
traspasoSchema.index({ createdAt: -1 });

const Traspaso = models.Traspaso || model("Traspaso", traspasoSchema);

export default Traspaso;
