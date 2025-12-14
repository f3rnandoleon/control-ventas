import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/user";
import { connectDB } from "@/libs/mongodb";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 🔎 Validaciones
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    await connectDB();

    // 🔐 Buscar usuario (incluyendo password)
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // 🚫 Usuario inactivo
    if (!user.isActive) {
      return NextResponse.json(
        { message: "Usuario deshabilitado" },
        { status: 403 }
      );
    }

    // 🔑 Comparar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // 🕒 Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
    throw new Error("JWT_SECRET no está definido");
    }

    // 🪪 Generar JWT
    const token = jwt.sign(
    {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
    },
    JWT_SECRET,
    {
        expiresIn: "1d",
    }
    );

    // 🧹 Respuesta limpia
    return NextResponse.json(
      {
        message: "Login exitoso",
        token,
        user: {
          id: user._id,
          email: user.email,
          fullname: user.fullname,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
