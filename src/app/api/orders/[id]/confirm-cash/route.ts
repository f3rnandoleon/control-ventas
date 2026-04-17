import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { confirmCashOrder } from "@/modules/payments/application/payments.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/orders/:id/confirm-cash
 * Solo ADMIN o VENDEDOR. Confirma un pedido con pago en EFECTIVO.
 * - Consume stock reservado
 * - Crea la Venta
 * - Finaliza el pedido
 */
export async function POST(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);
    if (!userAuth || !["ADMIN", "VENDEDOR"].includes(userAuth.role)) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    const { id: orderId } = await context.params;
    const result = await confirmCashOrder(orderId, {
      id: userAuth.id,
      role: userAuth.role,
    });

    return NextResponse.json({
      message: "Pedido en efectivo confirmado y venta creada exitosamente.",
      order: {
        _id: result.order._id,
        orderNumber: result.order.orderNumber,
        orderStatus: result.order.orderStatus,
        paymentStatus: result.order.paymentStatus,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al confirmar pedido en efectivo",
      logLabel: "POST orders/confirm-cash error:",
    });
  }
}
