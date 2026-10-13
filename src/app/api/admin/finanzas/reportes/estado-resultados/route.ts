import { NextResponse } from "next/server";
import { generarEstadoResultados } from "@/modules/finance/application/financial-reports.service";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const ahora = new Date();
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const hoy = ahora.toISOString().split("T")[0];

    const desde = url.searchParams.get("desde") || primerDiaMes;
    const hasta = url.searchParams.get("hasta") || hoy;
    const sucursalId = url.searchParams.get("sucursalId") || undefined;

    const reporte = await generarEstadoResultados({
      desde,
      hasta,
      sucursalId,
    });

    return NextResponse.json(reporte);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al generar Estado de Resultados",
      logLabel: "GET /api/admin/finanzas/reportes/estado-resultados error:",
    });
  }
}
