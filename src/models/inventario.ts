import { Schema, model, models, Types } from "mongoose";

const inventarioSchema = new Schema(
  {
    productoId: {
      type: Types.ObjectId,
      ref: "Producto",
      required: true,
    },

    variante: {
      variantId: { type: String, index: true },
      color: { type: String, required: true },
      colorSecundario: { type: String, trim: true },
      talla: { type: String, required: true },
      codigoBarra: { type: String },
    },

    productoSnapshot: {
      nombre: { type: String },
      modelo: { type: String },
      sku: { type: String },
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

inventarioSchema.index({ productoId: 1, createdAt: -1 });
inventarioSchema.index({ "variante.variantId": 1, createdAt: -1 });
inventarioSchema.index({ referencia: 1, createdAt: -1 });

const Inventario = models.Inventario || model("Inventario", inventarioSchema);

export default Inventario;
