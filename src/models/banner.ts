import { Schema, model, models } from "mongoose";

const bannerSchema = new Schema(
  {
    titulo: {
      type: String,
      required: [true, "El título del banner es obligatorio"],
      trim: true,
      maxlength: 120,
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    imagenDesktopUrl: {
      type: String,
      required: [true, "La imagen para desktop es obligatoria"],
      trim: true,
    },
    imagenMobileUrl: {
      type: String,
      trim: true,
    },
    tipoAccion: {
      type: String,
      enum: ["WHATSAPP", "URL_EXTERNA", "NINGUNA"],
      default: "WHATSAPP",
    },
    whatsappNumero: {
      type: String,
      default: "67113105",
      trim: true,
    },
    whatsappMensaje: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    enlaceUrl: {
      type: String,
      trim: true,
    },
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },
    orden: {
      type: Number,
      default: 0,
      index: true,
    },
    fechaInicio: {
      type: Date,
    },
    fechaFin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ activo: 1, orden: 1, createdAt: -1 });

const Banner = models.Banner || model("Banner", bannerSchema);

export default Banner;

