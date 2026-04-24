import { NextResponse } from "next/server";
import { confirmPaymentByToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

/**
 * POST /api/verify/payment/:token/confirm
 * Ruta PÚBLICA — autorización por token (el token es la clave).
 * El admin confirma el pago. El sistema:
 * - Marca el pago como PAID
 * - Confirma el pedido (CONFIRMED)
 * - Descuenta el stock (reservedStock → stock definitivo)
 * - Crea la Venta en la colección de ventas
 * - Invalida el token (reviewTokenUsed = true)
 */
export async function POST(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const result = await confirmPaymentByToken(token);

    return NextResponse.json({
      message: "Pago confirmado correctamente. Venta registrada.",
      order: {
        _id: result.order._id,
        orderNumber: result.order.orderNumber,
        orderStatus: result.order.orderStatus,
        paymentStatus: result.order.paymentStatus,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al confirmar el pago",
      logLabel: "POST verify/payment/confirm error:",
    });
  }
}
