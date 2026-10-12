import { NextResponse } from "next/server";
import { getKardexConsolidado } from "@/modules/inventory/application/kardex.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const kardexConsolidado = await getKardexConsolidado();
    return NextResponse.json(kardexConsolidado);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener kardex consolidado",
      logLabel: "KARDEX CONSOLIDADO GET ERROR:",
    });
  }
}
