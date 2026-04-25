import { NextResponse } from "next/server";
import { confirmPaymentByToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

/**
 * POST /api/verificar/pago/:token/confirm
 * Ruta pública: autorización por token.
 */
export async function POST(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const result = await confirmPaymentByToken(token);

    return NextResponse.json({
      message: "Pago confirmado correctamente.",
      pedido: {
        _id: result.pedido._id,
        numeroPedido: result.pedido.numeroPedido,
        estadoPedido: result.pedido.estadoPedido,
        estadoPago: result.pedido.estadoPago,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al confirmar el pago",
      logLabel: "POST verificar/pago/confirm error:",
    });
  }
}
