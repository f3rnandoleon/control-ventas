import { Schema, model, models } from "mongoose";

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
      required: true,
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
