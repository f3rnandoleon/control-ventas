import { NextResponse } from "next/server";
import { getPaymentByReviewToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

/**
 * GET /api/verificar/pago/:token
 * Ruta pública: no requiere autenticación.
 */
export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;

    const { payment, pedido } = await getPaymentByReviewToken(token);

    return NextResponse.json({
      payment: {
        _id: payment._id,
        numeroPago: payment.numeroPago,
        metodoPago: payment.metodoPago,
        monto: payment.monto,
        estado: payment.estado,
        urlComprobante: payment.urlComprobante,
        createdAt: payment.createdAt,
      },
      pedido,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Link de verificación inválido",
      logLabel: "GET verificar/pago error:",
    });
  }
}
