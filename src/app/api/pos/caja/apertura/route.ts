import { NextResponse } from "next/server";
import { abrirSesionCaja } from "@/modules/finance/application/cash-register-session.service";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const sesion = await abrirSesionCaja(
      {
        sucursalId: body.sucursalId,
        montoApertura: Number(body.montoApertura || 0),
        notasApertura: body.notasApertura || undefined,
      },
      auth.userAuth.id
    );

    return NextResponse.json(sesion, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al abrir sesión de caja",
      logLabel: "POST /api/pos/caja/apertura error:",
    });
  }
}
