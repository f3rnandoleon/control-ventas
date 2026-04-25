import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { confirmCashOrder } from "@/modules/payments/application/payments.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/pedidos/:id/confirm-cash
 * Solo ADMIN o VENDEDOR. Confirma un pedido con pago en EFECTIVO.
 * - Consume stock reservado
 * - Crea el pago
 * - Finaliza el pedido
 */
export async function POST(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);
    if (!userAuth || !["ADMIN", "VENDEDOR"].includes(userAuth.rol)) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    const { id: pedidoId } = await context.params;
    const result = await confirmCashOrder(pedidoId, {
      id: userAuth.id,
      rol: userAuth.rol,
    });

    return NextResponse.json({
      message: "Pedido en efectivo confirmado correctamente.",
      pedido: {
        _id: result.pedido._id,
        numeroPedido: result.pedido.numeroPedido,
        estadoPedido: result.pedido.estadoPedido,
        estadoPago: result.pedido.estadoPago,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al confirmar pedido en efectivo",
      logLabel: "POST pedidos/confirm-cash error:",
    });
  }
}
