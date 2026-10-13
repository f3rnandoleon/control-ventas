import { NextResponse } from "next/server";
import { reabrirPeriodoContable } from "@/modules/finance/application/financial-reports.service";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const resultado = await reabrirPeriodoContable(id, auth.userAuth.id);

    return NextResponse.json(resultado);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al reabrir periodo contable",
      logLabel: "POST /api/admin/finanzas/periodos/[id]/reabrir error:",
    });
  }
}
