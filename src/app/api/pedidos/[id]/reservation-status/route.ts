import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { getOrderReservationStatus } from "@/modules/orders/application/pedidos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/pedidos/:id/reservation-status?token=<reservationToken>
 * Consulta pública/autenticada del estado de reserva de un pedido.
 * Si el plazo venció sin comprobante subido, libera el stock atómicamente (lazy expiration).
 */
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const userAuth = await resolveApiAuth(request);
    const { searchParams } = new URL(request.url);
    const token =
      searchParams.get("token")?.trim() ||
      request.headers.get("x-reservation-token")?.trim() ||
      null;

    const result = await getOrderReservationStatus(id, {
      userId: userAuth?.id ?? null,
      role: userAuth?.rol ?? null,
      token,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al consultar estado de la reserva",
      logLabel: "GET pedidos/[id]/reservation-status error:",
    });
  }
}
