import { NextResponse } from "next/server";
import { getSalesBySellerReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const vendedores = await getSalesBySellerReport(request);
    return NextResponse.json(vendedores);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte por vendedor",
      logLabel: "REPORTE VENDEDORES ERROR:",
    });
  }
}
