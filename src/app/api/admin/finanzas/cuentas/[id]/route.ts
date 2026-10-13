import { NextResponse } from "next/server";
import {
  getCuentaDineroById,
  actualizarCuentaDinero,
} from "@/modules/finance/application/cash-account.service";
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";
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
    const cuenta = await getCuentaDineroById(id);
    return NextResponse.json(cuenta);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener cuenta de dinero",
      logLabel: "GET /api/admin/finanzas/cuentas/[id] error:",
    });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const actualizada = await actualizarCuentaDinero(id, body);

    return NextResponse.json(actualizada);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar cuenta de dinero",
      logLabel: "PUT /api/admin/finanzas/cuentas/[id] error:",
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const actualizada = await actualizarCuentaDinero(id, { activa: body.activa });

    return NextResponse.json(actualizada);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al modificar estado de la cuenta",
      logLabel: "PATCH /api/admin/finanzas/cuentas/[id] error:",
    });
  }
}
