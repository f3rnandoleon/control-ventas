import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import ModeloBase from "@/models/modeloBase";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const body = await request.json();
    const { nombre, descripcion, imagenUrl, esDefault } = body;

    await connectDB();

    const existing = await ModeloBase.findById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Modelo base no encontrado" },
        { status: 404 }
      );
    }

    if (esDefault && !existing.esDefault) {
      await ModeloBase.updateMany(
        { tipo: existing.tipo },
        { $set: { esDefault: false } }
      );
    }

    if (nombre) existing.nombre = nombre.trim();
    if (descripcion !== undefined) existing.descripcion = descripcion?.trim();
    if (imagenUrl) existing.imagenUrl = imagenUrl.trim();
    if (esDefault !== undefined) existing.esDefault = Boolean(esDefault);

    await existing.save();

    return NextResponse.json(existing);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar modelo base",
      logLabel: "ADMIN MODELOS BASE PUT ERROR:",
    });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    await connectDB();

    const existing = await ModeloBase.findById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Modelo base no encontrado" },
        { status: 404 }
      );
    }

    // Verificar cuántos modelos quedan de ese tipo
    const count = await ModeloBase.countDocuments({
      tipo: existing.tipo,
      activo: true,
    });
    if (count <= 1) {
      return NextResponse.json(
        { message: "No puedes eliminar el único modelo disponible para este tipo" },
        { status: 400 }
      );
    }

    // Si era default, marcar otro como default
    if (existing.esDefault) {
      const otro = await ModeloBase.findOne({
        tipo: existing.tipo,
        _id: { $ne: existing._id },
        activo: true,
      });
      if (otro) {
        otro.esDefault = true;
        await otro.save();
      }
    }

    await ModeloBase.findByIdAndDelete(id);

    return NextResponse.json({ message: "Modelo eliminado correctamente" });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar modelo base",
      logLabel: "ADMIN MODELOS BASE DELETE ERROR:",
    });
  }
}

