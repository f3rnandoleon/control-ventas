import { Schema, model, models, Types } from "mongoose";

const ventaItemSchema = new Schema(
  {
    productoId: {
      type: Types.ObjectId,
      ref: "Producto",
      required: true,
    },

    variante: {
      color: { type: String, required: true },
      talla: { type: String, required: true },
    },

    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },

    precioUnitario: {
      type: Number,
      required: true,
      min: 0,
    },

    precioCosto: {
      type: Number,
      required: true,
      min: 0,
    },

    ganancia: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const ventaSchema = new Schema(
  {
    numeroVenta: {
      type: String,
      unique: true,
      required: true,
    },

    items: {
      type: [ventaItemSchema],
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    descuento: {
      type: Number,
      default: 0,
      min: 0,
    },


    total: {
      type: Number,
      required: true,
      min: 0,
    },

    gananciaTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    metodoPago: {
      type: String,
      enum: ["EFECTIVO", "QR"],
      required: true,
    },

    tipoVenta: {
      type: String,
      enum: ["WEB", "APP_QR", "TIENDA"],
      required: true,
    },

    estado: {
      type: String,
      enum: ["PAGADA", "PENDIENTE", "CANCELADA"],
      default: "PAGADA",
    },

    vendedor: {
      type: Types.ObjectId,
      ref: "User",
    },

    cliente: {
      type: Types.ObjectId,
      ref: "User",
    },

    observaciones: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Venta = models.Venta || model("Venta", ventaSchema);
export default Venta;
