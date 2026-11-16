import { Schema, model, models } from "mongoose";

export const TIPOS_MODELO_BASE = [
  "VARON",
  "MUJER",
  "MUJER_POLLERA",
  "NINO",
  "COLGADOR",
  "MANIQUI_INVISIBLE",
  "VARON_ESPALDA",
  "MUJER_ESPALDA",
  "PRODUCTO_ESPALDA",
  "CLOSE_UP",
] as const;

export type TipoModeloBase = (typeof TIPOS_MODELO_BASE)[number];

export interface IModeloBase {
  _id?: string;
  tipo: TipoModeloBase;
  nombre: string;
  descripcion?: string;
  imagenUrl: string;
  esDefault: boolean;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const modeloBaseSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: TIPOS_MODELO_BASE,
      required: [true, "El tipo de modelo base es obligatorio"],
      index: true,
    },
    nombre: {
      type: String,
      required: [true, "El nombre del modelo es obligatorio"],
      trim: true,
      maxlength: 120,
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    imagenUrl: {
      type: String,
      required: [true, "La URL de imagen del modelo es obligatoria"],
      trim: true,
    },
    esDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

modeloBaseSchema.index({ tipo: 1, esDefault: 1, activo: 1 });

const ModeloBase = models.ModeloBase || model("ModeloBase", modeloBaseSchema);

export default ModeloBase;

