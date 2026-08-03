import { NextResponse } from "next/server";
import { rejectPaymentByToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { z } from "zod";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

const rejectSchema = z.object({
  reason: z.string().trim().max(250).optional(),
});

export async function POST(request: Request, context: Context) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { token } = await context.params;

    let reason: string | undefined;
    try {
      const body = await request.json();
      const parsed = rejectSchema.safeParse(body);
      if (parsed.success) reason = parsed.data.reason;
    } catch {
      // Empty body is allowed.
    }

    const result = await rejectPaymentByToken(auth.userAuth, token, reason);

    return NextResponse.json(
      {
        message: "Pago rechazado. El pedido fue cancelado y el stock liberado.",
        pedido: {
          _id: result.pedido._id,
          numeroPedido: result.pedido.numeroPedido,
          estadoPedido: result.pedido.estadoPedido,
          estadoPago: result.pedido.estadoPago,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al rechazar el pago",
      logLabel: "POST verificar/pago/reject error:",
    });
  }
}
