import { Schema, model, models } from "mongoose";

export const authProviderValues = ["credentials", "google"] as const;
export type AuthProvider = (typeof authProviderValues)[number];

const usuarioSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Email no válido",
      ],
    },

    password: {
      type: String,
      required(this: { proveedoresAuth?: AuthProvider[] }) {
        return !(this.proveedoresAuth || []).includes("google");
      },
      select: false, // No se devuelve por defecto
    },

    nombreCompleto: {
      type: String,
      required: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [50, "El nombre debe tener como máximo 50 caracteres"],
      trim: true,
    },

    rol: {
      type: String,
      enum: ["ADMIN", "VENDEDOR", "CLIENTE"],
      default: "CLIENTE",
    },

    estaActivo: {
      type: Boolean,
      default: true,
    },

    proveedoresAuth: {
      type: [
        {
          type: String,
          enum: authProviderValues,
        },
      ],
      default: ["credentials"],
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    urlAvatar: {
      type: String,
      default: null,
      trim: true,
    },

    emailVerificado: {
      type: Boolean,
      default: false,
    },

    ultimoAcceso: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt y updatedAt
  }
);

const User = models.User || model("User", usuarioSchema);
export default User;
