import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Banner from "@/models/banner";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { updateBannerSchema } from "@/schemas/banner.schema";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    await connectDB();

    const banner = await Banner.findById(id).lean();
    if (!banner) {
      return NextResponse.json({ message: "Banner no encontrado" }, { status: 404 });
    }

    return NextResponse.json(banner);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener banner",
      logLabel: "ADMIN BANNER GET BY ID ERROR:",
    });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBannerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos de actualización inválidos",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.fechaInicio !== undefined) {
      updateData.fechaInicio = parsed.data.fechaInicio ? new Date(parsed.data.fechaInicio) : null;
    }
    if (parsed.data.fechaFin !== undefined) {
      updateData.fechaFin = parsed.data.fechaFin ? new Date(parsed.data.fechaFin) : null;
    }

    const updated = await Banner.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ message: "Banner no encontrado" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar banner",
      logLabel: "ADMIN BANNER PUT ERROR:",
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    await connectDB();

    const deleted = await Banner.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ message: "Banner no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Banner eliminado correctamente", id });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar banner",
      logLabel: "ADMIN BANNER DELETE ERROR:",
    });
  }
}

