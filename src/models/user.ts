import { Schema, model, models } from "mongoose";

export const authProviderValues = ["credentials", "google"] as const;
export type AuthProvider = (typeof authProviderValues)[number];

const userSchema = new Schema(
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
      required(this: { authProviders?: AuthProvider[] }) {
        return !(this.authProviders || []).includes("google");
      },
      select: false, // No se devuelve por defecto
    },

    fullname: {
      type: String,
      required: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [50, "El nombre debe tener como máximo 50 caracteres"],
      trim: true,
    },

    role: {
      type: String,
      enum: ["ADMIN", "VENDEDOR", "CLIENTE"],
      default: "CLIENTE",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    authProviders: {
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

    avatarUrl: {
      type: String,
      default: null,
      trim: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt y updatedAt
  }
);

const User = models.User || model("User", userSchema);
export default User;
