import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/user";
import { connectDB } from "@/libs/mongodb";

export async function POST(request: Request) {
  try {
    const { email, password, fullname, role } = await request.json();

    // 🔎 Validaciones básicas
    if (!email || !password || !fullname) {
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
    const userRole = allowedRoles.includes(role) ? role : "CLIENTE";

    const user = new User({
      email: emailLower,
      fullname,
      password: hashedPassword,
      role: userRole,
      isActive: true,
    });

    await user.save();

    // 🧹 Respuesta limpia (sin token - debe hacer login después)
    return NextResponse.json(
      {
        message: "Usuario creado correctamente. Por favor inicia sesión.",
        user: {
          id: user._id,
          email: user.email,
          fullname: user.fullname,
          role: user.role,
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
