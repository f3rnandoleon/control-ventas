import { NextResponse } from "next/server";
import { rejectPaymentByToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { z } from "zod";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

const rejectSchema = z.object({
  reason: z.string().trim().max(250).optional(),
});

/**
 * POST /api/verificar/pago/:token/reject
 * Ruta pública: autorización por token.
 */
export async function POST(request: Request, context: Context) {
  try {
    const { token } = await context.params;

    let reason: string | undefined;
    try {
      const body = await request.json();
      const parsed = rejectSchema.safeParse(body);
      if (parsed.success) reason = parsed.data.reason;
    } catch {
      // body vacío está bien
    }

    const result = await rejectPaymentByToken(token, reason);

    return NextResponse.json({
      message: "Pago rechazado. El pedido fue cancelado y el stock liberado.",
      pedido: {
        _id: result.pedido._id,
        numeroPedido: result.pedido.numeroPedido,
        estadoPedido: result.pedido.estadoPedido,
        estadoPago: result.pedido.estadoPago,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al rechazar el pago",
      logLabel: "POST verificar/pago/reject error:",
    });
  }
}
