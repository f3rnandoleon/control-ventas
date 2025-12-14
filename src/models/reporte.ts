import { Schema, model, models } from "mongoose";

const reporteSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: [
        "VENTAS_DIARIAS",
        "VENTAS_MENSUALES",
        "VENTAS_ANUALES",
        "PRODUCTOS_MAS_VENDIDOS",
        "GANANCIAS",
        "INVENTARIO"
      ],
      required: true,
    },

    periodo: {
      fecha: { type: Date },
      mes: { type: Number }, // 1 - 12
      anio: { type: Number },
    },

    resumen: {
      totalVentas: { type: Number, default: 0 },
      cantidadVentas: { type: Number, default: 0 },
      gananciaTotal: { type: Number, default: 0 },
    },

    detalle: [
      {
        productoId: {
          type: String, // ObjectId convertido a string para flexibilidad
        },
        nombreProducto: String,
        modelo: String,
        color: String,
        talla: String,
        cantidadVendida: Number,
        totalVendido: Number,
        ganancia: Number,
      },
    ],

    porMetodoPago: {
      efectivo: { type: Number, default: 0 },
      tarjeta: { type: Number, default: 0 },
      qr: { type: Number, default: 0 },
      transferencia: { type: Number, default: 0 },
    },

    porTipoVenta: {
      web: { type: Number, default: 0 },
      appQr: { type: Number, default: 0 },
      mostrador: { type: Number, default: 0 },
    },

    generadoAutomaticamente: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Reporte = models.Reporte || model("Reporte", reporteSchema);
export default Reporte;
