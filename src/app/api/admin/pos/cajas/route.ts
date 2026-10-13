import { NextResponse } from "next/server";
import { listarSesionesCaja } from "@/modules/finance/application/cash-register-session.service";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const sucursalId = url.searchParams.get("sucursalId") || undefined;
    const estado = url.searchParams.get("estado") || undefined;
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;

    const sesiones = await listarSesionesCaja({ sucursalId, estado, limit });
    return NextResponse.json(sesiones);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar sesiones de caja",
      logLabel: "GET /api/admin/pos/cajas error:",
    });
  }
}
