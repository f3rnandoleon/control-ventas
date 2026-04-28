import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/user";
import { connectDB } from "@/libs/mongodb";
import { asegurarPerfilClienteParaUsuario } from "@/modules/clientes/application/clientes.service";

export async function POST(request: Request) {
  try {
    const { email, password, nombreCompleto, rol } = await request.json();

    // 🔎 Validaciones básicas
    if (!email || !password || !nombreCompleto) {
      return NextResponse.json(
        { message: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    await connectDB();

    // 🔐 Normalizar email
    const emailLower = email.toLowerCase();

    const userFound = await User.findOne({ email: emailLower });
    if (userFound) {
      return NextResponse.json(
        { message: "El email ya está registrado" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // 🧑‍💼 Control de roles
    const allowedRoles = ["CLIENTE"];
    const userRole = allowedRoles.includes(rol) ? rol : "CLIENTE";

    const user = new User({
      email: emailLower,
      nombreCompleto,
      password: hashedPassword,
      rol: userRole,
      estaActivo: true,
      authProviders: ["credentials"],
      emailVerified: false,
    });

    await user.save();
    await asegurarPerfilClienteParaUsuario(user._id.toString());

    // 🧹 Respuesta limpia (sin token - debe hacer login después)
    return NextResponse.json(
      {
        message: "Usuario creado correctamente. Por favor inicia sesión.",
        user: {
          id: user._id,
          email: user.email,
          nombreCompleto: user.nombreCompleto,
          rol: user.rol,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
