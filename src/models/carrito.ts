import { Schema, model, models, Types } from "mongoose";

const cartItemSchema = new Schema(
  {
    productoId: {
      type: Types.ObjectId,
      ref: "Producto",
      required: true,
    },
    variante: {
      varianteId: { type: String, index: true },
      color: { type: String, required: true },
      colorSecundario: { type: String, trim: true },
      talla: { type: String, required: true },
      codigoBarra: { type: String },
      qrCode: { type: String },
    },
    productoSnapshot: {
      nombre: { type: String, required: true },
      modelo: { type: String },
      sku: { type: String },
      imagen: { type: String },
    },
    precioUnitario: {
      type: Number,
      required: true,
      min: 0,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const carritoSchema = new Schema(
  {
    cliente: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totalArticulos: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Carrito = models.Carrito || model("Carrito", carritoSchema);
export default Carrito;
