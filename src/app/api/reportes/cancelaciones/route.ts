import { NextResponse } from "next/server";
import { getCancellationsReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const cancelaciones = await getCancellationsReport(request);
    return NextResponse.json(cancelaciones);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte de cancelaciones",
      logLabel: "REPORTE CANCELACIONES ERROR:",
    });
  }
}
