import { Schema, model, models, Types } from "mongoose";

const medidasSchema = new Schema(
  {
    anchoPecho: { type: Number, min: 0 },
    anchoHombros: { type: Number, min: 0 },
    largoTotal: { type: Number, min: 0 },
    largoMangaAxila: { type: Number, min: 0 },
    largoMangaHombro: { type: Number, min: 0 },
  },
  { _id: false }
);

const varianteSchema = new Schema(
  {
    varianteId: {
      type: String,
      default: () => new Types.ObjectId().toString(),
    },
    color: { type: String, required: true },
    colorSecundario: { type: String, trim: true },
    talla: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    stockReservado: { type: Number, default: 0, min: 0 },
    descripcion: { type: String, trim: true },
    imagenes: { type: [String], default: [] },
    codigoBarra: { type: String },
    qrCode: { type: String },
    precioVenta: { type: Number, min: 0 },
    precioCosto: { type: Number, min: 0 },
    medidas: { type: medidasSchema, default: undefined },
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

    costoOrigen: {
      moneda: {
        type: String,
        enum: ["PEN", "BOB", "USD"],
        default: "BOB",
      },
      montoOriginal: {
        type: Number,
        min: 0,
      },
      tipoCambioAplicado: {
        type: Number,
        min: 0.01,
      },
      fechaRegistro: {
        type: Date,
        default: Date.now,
      },
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
productoSchema.index({ "variantes.varianteId": 1 }, { unique: true, sparse: true });

// ⚡ Índices optimizados para el Agente IA y catálogo omnicanal
productoSchema.index(
  { nombre: "text", modelo: "text", descripcion: "text" },
  { default_language: "spanish", weights: { nombre: 5, modelo: 3, descripcion: 1 } }
);
productoSchema.index({
  estado: 1,
  "variantes.color": 1,
  "variantes.talla": 1,
  "variantes.stock": 1,
});
productoSchema.index({ estado: 1, precioVenta: 1 });

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
