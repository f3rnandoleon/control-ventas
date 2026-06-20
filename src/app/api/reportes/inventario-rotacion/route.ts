import { NextResponse } from "next/server";
import { getInventoryRotationReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const rotacion = await getInventoryRotationReport(request);
    return NextResponse.json(rotacion);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte de rotacion de inventario",
      logLabel: "REPORTE ROTACION ERROR:",
    });
  }
}
