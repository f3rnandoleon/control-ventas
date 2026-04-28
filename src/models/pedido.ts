import { Schema, model, models, Types } from "mongoose";

const pedidoItemSchema = new Schema(
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
    totalLinea: {
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

const pedidoSchema = new Schema(
  {
    numeroPedido: {
      type: String,
      unique: true,
      required: true,
    },
    canal: {
      type: String,
      enum: ["WEB", "APP_QR", "TIENDA"],
      required: true,
    },
    estadoPedido: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "CONFIRMED",
      required: true,
    },
    estadoPago: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PAID",
      required: true,
    },
    estadoEntrega: {
      type: String,
      enum: ["PENDING", "READY", "IN_TRANSIT", "DELIVERED", "NOT_APPLICABLE", "CANCELLED"],
      default: "NOT_APPLICABLE",
      required: true,
    },
    estadoReservaStock: {
      type: String,
      enum: ["NONE", "RESERVED", "CONSUMED", "RELEASED"],
      default: "NONE",
      required: true,
    },
    reservadoEn: {
      type: Date,
      default: null,
    },
    reservaExpiraEn: {
      type: Date,
      default: null,
      index: true,
    },
    metodoPago: {
      type: String,
      enum: ["EFECTIVO", "QR"],
      required: true,
    },
    cliente: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    vendedor: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    snapshotCliente: {
      usuarioId: { type: Types.ObjectId, ref: "User" },
      nombreCompleto: { type: String },
      email: { type: String },
      telefono: { type: String, default: null },
      tipoDocumento: {
        type: String,
        enum: ["CI", "NIT", "PASAPORTE", "OTRO", null],
        default: null,
      },
      numeroDocumento: { type: String, default: null },
    },
    snapshotEntrega: {
      metodo: {
        type: String,
        enum: ["WHATSAPP", "PICKUP_POINT", "SHIPPING_NATIONAL", null],
        default: null,
      },
      puntoRecojo: {
        type: String,
        default: null,
      },
      direccion: {
        type: String,
        default: null,
      },
      telefono: {
        type: String,
        default: null,
      },
      nombreDestinatario: {
        type: String,
        default: null,
      },
      programadoPara: {
        type: String,
        default: null,
      },
      // Campos para envío a otro departamento
      departamento: {
        type: String,
        default: null,
      },
      ciudad: {
        type: String,
        default: null,
      },
      empresaEnvio: {
        type: String,
        default: null,
      },
      sucursal: {
        type: String,
        default: null,
      },
      nombreRemitente: {
        type: String,
        default: null,
      },
      ciRemitente: {
        type: String,
        default: null,
      },
      telefonoRemitente: {
        type: String,
        default: null,
      },
    },
    items: {
      type: [pedidoItemSchema],
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
    notas: {
      type: String,
      default: null,
    },
    motivoCancelacion: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

pedidoSchema.index({ cliente: 1, createdAt: -1 });
pedidoSchema.index({ vendedor: 1, createdAt: -1 });
pedidoSchema.index({ canal: 1, createdAt: -1 });
pedidoSchema.index({ estadoPedido: 1, createdAt: -1 });
pedidoSchema.index({ estadoPago: 1, createdAt: -1 });
pedidoSchema.index({ estadoEntrega: 1, createdAt: -1 });
pedidoSchema.index({ estadoReservaStock: 1, reservaExpiraEn: 1 });

const Pedido = models.Pedido || model("Pedido", pedidoSchema);
export default Pedido;
