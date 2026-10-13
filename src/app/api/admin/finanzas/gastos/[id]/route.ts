import { NextResponse } from "next/server";
import { eliminarGasto } from "@/modules/finance/application/expenses.service";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const resultado = await eliminarGasto(id, auth.userAuth.id);

    return NextResponse.json(resultado);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar gasto",
      logLabel: "DELETE /api/admin/finanzas/gastos/[id] error:",
    });
  }
}
