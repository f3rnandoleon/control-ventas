import { NextResponse } from "next/server";
import { listarDevolucionesCambios } from "@/modules/sales-returns/application/returns.service";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const sucursalId = url.searchParams.get("sucursalId") || undefined;
    const tipo = url.searchParams.get("tipo") || undefined;
    const desde = url.searchParams.get("desde") || undefined;
    const hasta = url.searchParams.get("hasta") || undefined;
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : undefined;

    const devoluciones = await listarDevolucionesCambios({
      sucursalId,
      tipo,
      desde,
      hasta,
      limit,
    });

    return NextResponse.json(devoluciones);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar devoluciones y cambios",
      logLabel: "GET /api/admin/finanzas/devoluciones error:",
    });
  }
}
