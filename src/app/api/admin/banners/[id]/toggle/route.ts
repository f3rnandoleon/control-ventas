import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Banner from "@/models/banner";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    await connectDB();

    const banner = await Banner.findById(id);
    if (!banner) {
      return NextResponse.json({ message: "Banner no encontrado" }, { status: 404 });
    }

    banner.activo = !banner.activo;
    await banner.save();

    return NextResponse.json({
      message: `Banner ${banner.activo ? "activado" : "desactivado"} correctamente`,
      banner,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al cambiar estado del banner",
      logLabel: "ADMIN BANNER TOGGLE ERROR:",
    });
  }
}

