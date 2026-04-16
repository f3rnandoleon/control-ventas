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
 * POST /api/verify/payment/:token/reject
 * Ruta PÚBLICA — autorización por token.
 * El admin rechaza el pago. El sistema:
 * - Marca el pago como FAILED
 * - Cancela el pedido
 * - Libera el stock reservado
 * - Invalida el token
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
      order: {
        _id: result.order._id,
        orderNumber: result.order.orderNumber,
        orderStatus: result.order.orderStatus,
        paymentStatus: result.order.paymentStatus,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al rechazar el pago",
      logLabel: "POST verify/payment/reject error:",
    });
  }
}
