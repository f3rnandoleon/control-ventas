import { NextResponse } from "next/server";
import { obtenerSesionCajaActiva } from "@/modules/finance/application/cash-register-session.service";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import Sucursal from "@/models/sucursal";
import { getDefaultWarehouseId } from "@/modules/inventory/application/branch-stock.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    let sucursalId = url.searchParams.get("sucursalId");

    await connectDB();
    if (!sucursalId) {
      const user = await User.findById(auth.userAuth.id).select("sucursalAsignadaId");
      if (user?.sucursalAsignadaId) {
        sucursalId = user.sucursalAsignadaId.toString();
      } else {
        const defaultBranch = await getDefaultWarehouseId();
        sucursalId = defaultBranch ? defaultBranch.toString() : "";
      }
    }

    if (!sucursalId) {
      return NextResponse.json({ sesion: null, sucursal: null });
    }

    const [sucursal, sesion] = await Promise.all([
      Sucursal.findById(sucursalId)
        .select("nombre requiereAperturaCaja")
        .lean() as Promise<{ _id?: unknown; nombre?: string; requiereAperturaCaja?: boolean } | null>,
      obtenerSesionCajaActiva(sucursalId),
    ]);

    return NextResponse.json({
      sesion,
      sucursal: {
        _id: sucursalId,
        nombre: sucursal?.nombre || "Sucursal",
        requiereAperturaCaja: sucursal?.requiereAperturaCaja ?? true,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al consultar sesión de caja activa",
      logLabel: "GET /api/pos/caja/activa error:",
    });
  }
}
