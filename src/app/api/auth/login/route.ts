import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import {
  buildAuthTokenUser,
  issueAuthTokens,
} from "@/modules/auth/application/auth-tokens.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email y contrasena son obligatorios" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    if (!user.estaActivo) {
      return NextResponse.json(
        { message: "Usuario deshabilitado" },
        { status: 401 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        {
          message:
            "Esta cuenta fue registrada con Google. Ingresa con Google desde la web de clientes.",
        },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    try {
      user.ultimoAcceso = new Date();
      await user.save();
    } catch (error) {
      console.error("Error actualizando ultimoAcceso en /api/auth/login:", error);
    }

    const authUser = buildAuthTokenUser({
      _id: user._id,
      email: user.email,
      nombreCompleto: user.nombreCompleto,
      rol: user.rol,
    });
    const { accessToken, refreshToken } = issueAuthTokens(authUser);

    return NextResponse.json(
      {
        message: "Login exitoso",
        accessToken,
        refreshToken,
        user: authUser,
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
