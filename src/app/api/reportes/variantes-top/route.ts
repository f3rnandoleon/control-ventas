import { NextResponse } from "next/server";
import { getTopVariantsReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const variantes = await getTopVariantsReport(request);
    return NextResponse.json(variantes);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte de variantes",
      logLabel: "REPORTE VARIANTES TOP ERROR:",
    });
  }
}
