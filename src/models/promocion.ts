import { Schema, model, models, Types } from "mongoose";

const reglaNxMSchema = new Schema(
  {
    lleva: { type: Number, min: 2, required: true },
    paga: { type: Number, min: 1, required: true },
  },
  { _id: false }
);

const condicionesPromocionSchema = new Schema(
  {
    montoMinimoCompra: { type: Number, min: 0, default: 0 },
    cantidadMinimaPrendas: { type: Number, min: 0, default: 0 },
    soloPrimeraCompra: { type: Boolean, default: false },
  },
  { _id: false }
);

const promocionSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: 400,
      default: "",
    },
    estado: {
      type: String,
      enum: ["BORRADOR", "ACTIVA", "PAUSADA", "FINALIZADA"],
      default: "ACTIVA",
      required: true,
      index: true,
    },
    canales: {
      type: [String],
      enum: ["WEB", "WHATSAPP"],
      default: ["WEB"],
      required: true,
    },
    metodoActivacion: {
      type: String,
      enum: ["AUTOMATICA", "CUPON"],
      default: "AUTOMATICA",
      required: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["PORCENTAJE", "MONTO_FIJO", "NXM", "SEGUNDA_UNIDAD", "ENVIO_GRATIS"],
      required: true,
    },
    valor: {
      type: Number,
      min: 0,
      default: 0,
    },
    reglaNxM: {
      type: reglaNxMSchema,
      default: null,
    },
    descuentoMaximo: {
      type: Number,
      min: 0,
      default: null,
    },
    alcance: {
      type: String,
      enum: ["PEDIDO", "PRODUCTOS", "CATEGORIAS", "ENVIO"],
      default: "PEDIDO",
      required: true,
    },
    productosIncluidos: {
      type: [{ type: Types.ObjectId, ref: "Producto" }],
      default: [],
    },
    categoriasIncluidas: {
      type: [String],
      default: [],
    },
    productosExcluidos: {
      type: [{ type: Types.ObjectId, ref: "Producto" }],
      default: [],
    },
    condiciones: {
      type: condicionesPromocionSchema,
      default: () => ({
        montoMinimoCompra: 0,
        cantidadMinimaPrendas: 0,
        soloPrimeraCompra: false,
      }),
    },
    prioridad: {
      type: Number,
      default: 10,
      index: true,
    },
    acumulable: {
      type: Boolean,
      default: false,
    },
    acumulableConRebajasCatalogo: {
      type: Boolean,
      default: false,
    },
    fechaInicio: {
      type: Date,
      default: null,
      index: true,
    },
    fechaFin: {
      type: Date,
      default: null,
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
    collection: "promociones",
  }
);

promocionSchema.index({ estado: 1, canales: 1, metodoActivacion: 1, prioridad: 1 });
promocionSchema.index({ estado: 1, fechaInicio: 1, fechaFin: 1 });

const Promocion = models.Promocion || model("Promocion", promocionSchema);
export default Promocion;
