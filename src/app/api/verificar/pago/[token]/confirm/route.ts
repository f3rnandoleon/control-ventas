import { NextResponse } from "next/server";
import { confirmPaymentByToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { token } = await context.params;
    const result = await confirmPaymentByToken(auth.userAuth, token);

    return NextResponse.json(
      {
        message: "Pago confirmado correctamente.",
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
      fallbackMessage: "Error al confirmar el pago",
      logLabel: "POST verificar/pago/confirm error:",
    });
  }
}
