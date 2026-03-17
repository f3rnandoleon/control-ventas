import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validación básica
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    // Conectar a la base de datos
    await connectDB();

    // Buscar al usuario
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Comprobar estado del usuario
    if (!user.isActive) {
      return NextResponse.json(
        { message: "Usuario deshabilitado" },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Actualizar la fecha del último login si es posible
    try {
      user.lastLogin = new Date();
      await user.save();
    } catch (error) {
      console.error("Error actualizando lastLogin en /api/auth/login:", error);
    }

    // Crear el payload JWT
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullname: user.fullname,
    };

    const secret = process.env.JWT_SECRET || "fallback_secret";
    const expiresIn = (process.env.JWT_EXPIRES_IN || "1d") as jwt.SignOptions["expiresIn"];

    // Firmar accessToken
    const accessToken = jwt.sign(payload, secret, { expiresIn });

    // Firmar refreshToken (opcional, configurado para durar más tiempo, por ej. 7 días)
    const refreshToken = jwt.sign(
      { id: user._id.toString() },
      secret,
      { expiresIn: "7d" as jwt.SignOptions["expiresIn"] }
    );

    // Devolver un objeto estable y fácil de consumir por terceros Auth
    return NextResponse.json(
      {
        message: "Login exitoso",
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          fullname: user.fullname,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en POST /api/auth/login:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
