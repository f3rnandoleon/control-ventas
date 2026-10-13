import { NextResponse } from "next/server";
import {
  listCuentasDinero,
  crearCuentaDinero,
} from "@/modules/finance/application/cash-account.service";
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const activaParam = url.searchParams.get("activa");
    const sucursalId = url.searchParams.get("sucursalId") || undefined;

    const cuentas = await listCuentasDinero({
      activa: activaParam !== null ? activaParam === "true" : undefined,
      sucursalId,
    });

    return NextResponse.json(cuentas);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener cuentas de dinero",
      logLabel: "GET /api/admin/finanzas/cuentas error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const nuevaCuenta = await crearCuentaDinero(body, auth.userAuth.id);

    return NextResponse.json(nuevaCuenta, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear cuenta de dinero",
      logLabel: "POST /api/admin/finanzas/cuentas error:",
    });
  }
}
