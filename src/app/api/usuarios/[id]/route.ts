import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import bcrypt from "bcryptjs";
import type { Usuario, UserRole } from "@/types/usuario";
import { validateRequest, validationErrorResponse } from "@/middleware/validate.middleware";
import { updateUsuarioSchema } from "@/schemas/usuario.schema";

type UpdateUsuarioDTO = {
  fullname?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const headersList = await headers();
    const role = headersList.get("x-user-role");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    // Validar datos con Zod
    const validation = await validateRequest(updateUsuarioSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const data = validation.data;

    await connectDB();

    const updateData: Partial<Usuario & { password: string }> = {
      fullname: data.fullname,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
    };

    // 🔐 SOLO actualizar password si viene y no está vacío
    if (data.password && data.password.trim() !== "") {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("PUT usuario error:", err);
    return NextResponse.json(
      { message: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}
