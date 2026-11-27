import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { expireOrderReservationByActor } from "@/modules/orders/application/pedidos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/pedidos/:id/expire-reservation
 * Expira explícitamente una reserva (ej. al llegar a 00:00 en frontend),
 * liberando stock, revirtiendo promociones/cupones y marcando el pedido y pago como expirados.
 * Idempotente: si ya tiene comprobante o ya fue liberado, responde sin error.
 */
export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const userAuth = await resolveApiAuth(request);

    let body: { token?: unknown; reservationToken?: unknown } = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object") {
        body = parsed as { token?: unknown; reservationToken?: unknown };
      }
    } catch {
      // Body vacío es válido si viene con sesión o header x-reservation-token
    }

    const bodyToken =
      typeof body.token === "string"
        ? body.token.trim()
        : typeof body.reservationToken === "string"
          ? body.reservationToken.trim()
          : null;
    const token =
      bodyToken || request.headers.get("x-reservation-token")?.trim() || null;

    const result = await expireOrderReservationByActor(id, {
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
      fallbackMessage: "Error al expirar la reserva del pedido",
      logLabel: "POST pedidos/[id]/expire-reservation error:",
    });
  }
}
