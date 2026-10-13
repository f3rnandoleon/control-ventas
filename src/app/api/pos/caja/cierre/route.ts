import { NextResponse } from "next/server";
import { cerrarSesionCaja } from "@/modules/finance/application/cash-register-session.service";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const sesion = await cerrarSesionCaja(
      {
        sesionId: body.sesionId,
        montoDeclaradoEfectivo: Number(body.montoDeclaradoEfectivo || 0),
        notasCierre: body.notasCierre || undefined,
      },
      auth.userAuth.id
    );

    return NextResponse.json(sesion);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al cerrar sesión de caja",
      logLabel: "POST /api/pos/caja/cierre error:",
    });
  }
}
