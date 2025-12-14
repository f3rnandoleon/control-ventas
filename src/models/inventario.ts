import { Schema, model, models, Types } from "mongoose";

const inventarioSchema = new Schema(
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

    tipo: {
      type: String,
      enum: ["ENTRADA", "SALIDA", "AJUSTE", "DEVOLUCION"],
      required: true,
    },

    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },

    stockAnterior: {
      type: Number,
      required: true,
    },

    stockActual: {
      type: Number,
      required: true,
    },

    motivo: {
      type: String,
    },

    referencia: {
      type: String, // ej: ID de venta, factura, nota
    },

    usuario: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Inventario = models.Inventario || model("Inventario", inventarioSchema);

export default Inventario;
