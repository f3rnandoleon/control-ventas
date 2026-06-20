import { NextResponse } from "next/server";
import { getDailySalesReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const ventas = await getDailySalesReport(request);
    return NextResponse.json(ventas);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte diario",
      logLabel: "REPORTE DIARIO ERROR:",
    });
  }
}
