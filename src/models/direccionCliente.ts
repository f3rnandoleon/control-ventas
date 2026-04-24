import { Schema, model, models, Types } from "mongoose";

const direccionClienteSchema = new Schema(
  {
    perfilClienteId: {
      type: Types.ObjectId,
      ref: "PerfilCliente",
      required: true,
      index: true,
    },
    etiqueta: {
      type: String,
      required: true,
      trim: true,
    },
    nombreDestinatario: {
      type: String,
      required: true,
      trim: true,
    },
    telefono: {
      type: String,
      required: true,
      trim: true,
    },
    departamento: {
      type: String,
      required: true,
      trim: true,
    },
    ciudad: {
      type: String,
      required: true,
      trim: true,
    },
    zona: {
      type: String,
      trim: true,
      default: null,
    },
    direccion: {
      type: String,
      required: true,
      trim: true,
    },
    referencia: {
      type: String,
      trim: true,
      default: null,
    },
    codigoPostal: {
      type: String,
      trim: true,
      default: null,
    },
    pais: {
      type: String,
      trim: true,
      default: "Bolivia",
    },
    esPredeterminada: {
      type: Boolean,
      default: false,
      index: true,
    },
    estaActiva: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

direccionClienteSchema.index({
  perfilClienteId: 1,
  estaActiva: 1,
  esPredeterminada: -1,
  createdAt: -1,
});

const DireccionCliente =
  models.DireccionCliente ||
  model("DireccionCliente", direccionClienteSchema);

export default DireccionCliente;
