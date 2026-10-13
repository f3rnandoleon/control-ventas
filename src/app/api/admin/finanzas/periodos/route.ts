import { NextResponse } from "next/server";
import {
  listarPeriodosCerrados,
  cerrarPeriodoContable,
} from "@/modules/finance/application/financial-reports.service";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const periodos = await listarPeriodosCerrados();
    return NextResponse.json(periodos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar periodos contables",
      logLabel: "GET /api/admin/finanzas/periodos error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { anio, mes, observaciones } = body;

    const cierre = await cerrarPeriodoContable(
      Number(anio),
      Number(mes),
      auth.userAuth.id,
      observaciones
    );

    return NextResponse.json(cierre, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al cerrar periodo contable",
      logLabel: "POST /api/admin/finanzas/periodos error:",
    });
  }
}
