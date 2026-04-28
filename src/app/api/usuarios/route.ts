import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import bcrypt from "bcryptjs";
import { validateRequest, validationErrorResponse } from "@/middleware/validate.middleware";
import { createUsuarioSchema } from "@/schemas/usuario.schema";
import { asegurarPerfilClienteParaUsuario } from "@/modules/clientes/application/clientes.service";

export async function GET() {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "No autorizado" },
      { status: 403 }
    );
  }

  await connectDB();
  const users = await User.find()
    .select("-password")
    .sort({ createdAt: -1 });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "No autorizado" },
      { status: 403 }
    );
  }

  // Validar datos con Zod
  const validation = await validateRequest(createUsuarioSchema, request);

  if (!validation.success) {
    return validationErrorResponse(validation.errors);
  }

  const { email, nombreCompleto, rol, password, estaActivo } = validation.data;

  await connectDB();

  // Verificar si el email ya existe
  const exists = await User.findOne({ email });
  if (exists) {
    return NextResponse.json(
      { message: "Email ya existe" },
      { status: 409 }
    );
  }

  // Hash de la contraseña
  const hash = await bcrypt.hash(password, 12);

  // Crear usuario
  const user = await User.create({
    email,
    nombreCompleto,
    rol,
    password: hash,
    estaActivo,
    authProviders: ["credentials"],
    emailVerified: false,
  });

  if (user.rol === "CLIENTE") {
    await asegurarPerfilClienteParaUsuario(user._id.toString());
  }

  return NextResponse.json(
    {
      message: "Usuario creado",
      user: {
        _id: user._id,
        email: user.email,
        nombreCompleto: user.nombreCompleto,
        rol: user.rol,
        estaActivo: user.estaActivo,
      },
    },
    { status: 201 }
  );
}
