import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import bcrypt from "bcryptjs";

import { validateRequest, validationErrorResponse } from "@/middleware/validate.middleware";
import { updateUsuarioSchema } from "@/schemas/usuario.schema";
import { asegurarPerfilClienteParaUsuario } from "@/modules/clientes/application/clientes.service";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    // Validar datos con Zod
    const validation = await validateRequest(updateUsuarioSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const data = validation.data;

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (data.nombreCompleto) updateData.nombreCompleto = data.nombreCompleto;
    if (data.email) updateData.email = data.email;
    if (data.rol) updateData.rol = data.rol;
    if (data.estaActivo !== undefined) updateData.estaActivo = data.estaActivo;

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

    if (user.rol === "CLIENTE") {
      await asegurarPerfilClienteParaUsuario(user._id.toString());
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
