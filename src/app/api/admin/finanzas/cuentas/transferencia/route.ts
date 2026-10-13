import { NextResponse } from "next/server";
import { transferirEntreCuentas } from "@/modules/finance/application/cash-account.service";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const result = await transferirEntreCuentas({
      cuentaOrigenId: body.cuentaOrigenId,
      cuentaDestinoId: body.cuentaDestinoId,
      monto: Number(body.monto),
      concepto: body.concepto || "Traslado interno de fondos",
      usuarioId: auth.userAuth.id,
      sucursalId: body.sucursalId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al realizar transferencia entre cuentas",
      logLabel: "POST /api/admin/finanzas/cuentas/transferencia error:",
    });
  }
}
