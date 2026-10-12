import { Schema, model, models, Types } from "mongoose";

const nivelStockSchema = new Schema(
  {
    sucursalId: {
      type: Types.ObjectId,
      ref: "Sucursal",
      required: true,
      index: true,
    },
    productoId: {
      type: Types.ObjectId,
      ref: "Producto",
      required: true,
      index: true,
    },
    varianteId: {
      type: String,
      required: true,
      index: true,
    },
    stockFisico: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    stockReservado: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    stockMinimo: {
      type: Number,
      default: 2,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índice compuesto único para garantizar que una variante solo tenga un registro por sucursal
nivelStockSchema.index({ sucursalId: 1, varianteId: 1 }, { unique: true });
nivelStockSchema.index({ sucursalId: 1, productoId: 1 });

const NivelStock = models.NivelStock || model("NivelStock", nivelStockSchema);

export default NivelStock;
