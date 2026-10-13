import { NextResponse } from "next/server";
import {
  procesarDevolucionCambio,
  listarDevolucionesCambios,
} from "@/modules/sales-returns/application/returns.service";
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
    const devoluciones = await listarDevolucionesCambios({ pedidoId: id });

    return NextResponse.json(devoluciones);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener devoluciones del pedido",
      logLabel: "GET /api/pedidos/[id]/devoluciones error:",
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const resultado = await procesarDevolucionCambio(
      {
        ...body,
        pedidoId: id,
      },
      auth.userAuth.id
    );

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al procesar devolución o cambio",
      logLabel: "POST /api/pedidos/[id]/devoluciones error:",
    });
  }
}
