import { NextResponse } from "next/server";
import { getSalesBySellerReport } from "@/modules/reports/application/reports.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const vendedores = await getSalesBySellerReport(request);
    return NextResponse.json(vendedores);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en reporte por vendedor",
      logLabel: "REPORTE VENDEDORES ERROR:",
    });
  }
}
