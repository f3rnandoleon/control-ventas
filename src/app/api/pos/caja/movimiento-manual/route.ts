import { NextResponse } from "next/server";
import { registrarMovimientoManual } from "@/modules/finance/application/cash-register-session.service";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const sesion = await registrarMovimientoManual(
      {
        sesionId: body.sesionId,
        tipo: body.tipo,
        monto: Number(body.monto),
        motivo: body.motivo,
      },
      auth.userAuth.id
    );

    return NextResponse.json(sesion);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al registrar movimiento manual en caja",
      logLabel: "POST /api/pos/caja/movimiento-manual error:",
    });
  }
}
