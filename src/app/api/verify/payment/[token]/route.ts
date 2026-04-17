import { NextResponse } from "next/server";
import { getPaymentByReviewToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

/**
 * GET /api/verify/payment/:token
 * Ruta PÚBLICA — no requiere autenticación.
 * El admin accede con el link recibido vía Telegram para revisar el comprobante.
 * Devuelve datos del pago, el pedido y la URL del comprobante.
 */
export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;

    const { payment, order } = await getPaymentByReviewToken(token);

    return NextResponse.json({
      payment: {
        _id: payment._id,
        paymentNumber: payment.paymentNumber,
        metodoPago: payment.metodoPago,
        amount: payment.amount,
        status: payment.status,
        comprobanteUrl: payment.comprobanteUrl,
        createdAt: payment.createdAt,
      },
      order,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Link de verificación inválido",
      logLabel: "GET verify/payment error:",
    });
  }
}
