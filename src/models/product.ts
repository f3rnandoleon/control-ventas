import { Schema, model, models, Types } from "mongoose";

const varianteSchema = new Schema(
  {
    variantId: {
      type: String,
      default: () => new Types.ObjectId().toString(),
    },
    color: { type: String, required: true },
    colorSecundario: { type: String, trim: true },
    talla: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    descripcion: { type: String, trim: true },
    imagenes: { type: [String], default: [] },
    imagen: { type: String, trim: true },
    codigoBarra: { type: String },
    qrCode: { type: String },
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
      required: true,
      unique: true,
      immutable: true, 
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

productoSchema.index({ estado: 1, createdAt: -1 });
productoSchema.index({ "variantes.variantId": 1 }, { unique: true, sparse: true });
productoSchema.index({ "variantes.codigoBarra": 1 }, { unique: true, sparse: true });
productoSchema.index({ "variantes.qrCode": 1 }, { unique: true, sparse: true });

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
