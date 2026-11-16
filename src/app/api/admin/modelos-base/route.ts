import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import ModeloBase, { TIPOS_MODELO_BASE } from "@/models/modeloBase";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { INFO_TIPOS_MODELO } from "@/constants/modelos-base";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    await connectDB();

    let modelos = await ModeloBase.find({ activo: true })
      .sort({ tipo: 1, esDefault: -1, createdAt: 1 })
      .lean();

    // Si aún no hay modelos registrados en MongoDB, sembrar los iniciales
    if (modelos.length === 0) {
      const initialDocs = Object.values(INFO_TIPOS_MODELO).map((info) => ({
        tipo: info.tipo,
        nombre: info.nombre,
        descripcion: info.descripcion,
        imagenUrl: info.defaultImageUrl,
        esDefault: true,
        activo: true,
      }));

      await ModeloBase.insertMany(initialDocs);
      modelos = await ModeloBase.find({ activo: true })
        .sort({ tipo: 1, esDefault: -1, createdAt: 1 })
        .lean();
    }

    return NextResponse.json(modelos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar modelos base",
      logLabel: "ADMIN MODELOS BASE GET ERROR:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { tipo, nombre, descripcion, imagenUrl, esDefault } = body;

    if (!tipo || !TIPOS_MODELO_BASE.includes(tipo)) {
      return NextResponse.json(
        { message: "Tipo de modelo base inválido" },
        { status: 400 }
      );
    }

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json(
        { message: "El nombre del modelo es obligatorio" },
        { status: 400 }
      );
    }

    if (!imagenUrl || typeof imagenUrl !== "string" || !imagenUrl.trim()) {
      return NextResponse.json(
        { message: "La URL de la imagen es obligatoria" },
        { status: 400 }
      );
    }

    await connectDB();

    // Si este nuevo modelo se marca como default, desmarcar anteriores del mismo tipo
    if (esDefault) {
      await ModeloBase.updateMany({ tipo }, { $set: { esDefault: false } });
    }

    const nuevoModelo = await ModeloBase.create({
      tipo,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || undefined,
      imagenUrl: imagenUrl.trim(),
      esDefault: Boolean(esDefault),
      activo: true,
    });

    return NextResponse.json(nuevoModelo, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear modelo base",
      logLabel: "ADMIN MODELOS BASE POST ERROR:",
    });
  }
}

