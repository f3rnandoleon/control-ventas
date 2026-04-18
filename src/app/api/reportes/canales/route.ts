import { NextResponse } from "next/server";
import { getSalesByChannelReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const canales = await getSalesByChannelReport(request);
    return NextResponse.json(canales);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte por canal",
      logLabel: "REPORTE CANALES ERROR:",
    });
  }
}
