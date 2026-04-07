import { NextResponse } from "next/server";
import { getTopProductsReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const productos = await getTopProductsReport(request);
    return NextResponse.json(productos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte de productos",
      logLabel: "REPORTE PRODUCTOS TOP ERROR:",
    });
  }
}
