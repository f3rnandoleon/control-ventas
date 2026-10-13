import { NextResponse } from "next/server";
import { listMovimientosCuenta } from "@/modules/finance/application/cash-account.service";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const movimientos = await listMovimientosCuenta(id);

    return NextResponse.json(movimientos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener movimientos de la cuenta",
      logLabel: "GET /api/admin/finanzas/cuentas/[id]/movimientos error:",
    });
  }
}
