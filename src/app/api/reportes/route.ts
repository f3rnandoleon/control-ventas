import { NextResponse } from "next/server";
import { getGeneralReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const resumen = await getGeneralReport(request);
    return NextResponse.json(resumen);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al generar reporte",
      logLabel: "REPORTE GENERAL ERROR:",
    });
  }
}
