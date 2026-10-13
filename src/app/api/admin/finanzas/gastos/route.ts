import { NextResponse } from "next/server";
import {
  listarGastos,
  registrarGasto,
} from "@/modules/finance/application/expenses.service";
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const desde = url.searchParams.get("desde") || undefined;
    const hasta = url.searchParams.get("hasta") || undefined;
    const categoria = url.searchParams.get("categoria") || undefined;
    const naturaleza = url.searchParams.get("naturaleza") || undefined;
    const sucursalId = url.searchParams.get("sucursalId") || undefined;
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : undefined;

    const gastos = await listarGastos({
      desde,
      hasta,
      categoria,
      naturaleza,
      sucursalId,
      limit,
    });

    return NextResponse.json(gastos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar gastos",
      logLabel: "GET /api/admin/finanzas/gastos error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const nuevoGasto = await registrarGasto(body, auth.userAuth.id);

    return NextResponse.json(nuevoGasto, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al registrar gasto",
      logLabel: "POST /api/admin/finanzas/gastos error:",
    });
  }
}
