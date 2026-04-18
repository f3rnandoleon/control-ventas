import { NextResponse } from "next/server";
import { getMonthlySalesReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const ventas = await getMonthlySalesReport(request);
    return NextResponse.json(ventas);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte mensual",
      logLabel: "REPORTE MENSUAL ERROR:",
    });
  }
}
