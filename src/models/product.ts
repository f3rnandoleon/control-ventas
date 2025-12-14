import { Schema, model, models, Types } from "mongoose";

const varianteSchema = new Schema(
  {
    color: { type: String, required: true },
    talla: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    codigoBarra: { type: String, unique: true },
    qrCode: { type: String, unique: true },
  },
  { _id: false }
);

const productoSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },

    modelo: {
      type: String,
      required: true,
      trim: true,
    },

    categoria: {
      type: String,
      default: "Chompas",
    },

    descripcion: {
      type: String,
    },

    marca: {
      type: String,
    },

    sku: {
      type: String,
      unique: true,
      required: true,
    },

    precioVenta: {
      type: Number,
      required: true,
      min: 0,
    },

    precioCosto: {
      type: Number,
      required: true,
      min: 0,
    },

    descuento: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    imagenes: [
      {
        type: String,
      },
    ],

    variantes: {
      type: [varianteSchema],
      required: true,
    },

    stockTotal: {
      type: Number,
      default: 0,
    },

    stockMinimo: {
      type: Number,
      default: 5,
    },

    totalVendidos: {
      type: Number,
      default: 0,
    },

    estado: {
      type: String,
      enum: ["ACTIVO", "INACTIVO", "AGOTADO"],
      default: "ACTIVO",
    },

    creadoPor: {
      type: Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// 🔄 Calcular stock total automáticamente
productoSchema.pre("save", function (next) {
  this.stockTotal = this.variantes.reduce(
    (total, v) => total + v.stock,
    0
  );
  next();
});

const Producto = models.Producto || model("Producto", productoSchema);
export default Producto;
