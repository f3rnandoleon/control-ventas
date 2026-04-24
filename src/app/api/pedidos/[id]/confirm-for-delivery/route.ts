import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { confirmPedidoForDelivery } from "@/modules/orders/application/pedidos.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/orders/:id/confirm-for-delivery
 * Solo ADMIN o VENDEDOR. 
 * Mueve un pedido de PENDING_PAYMENT a CONFIRMED (Por Entregar)
 * Extiende la reserva indefinidamente.
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

    const { id: orderId } = await context.params;
    const order = await confirmPedidoForDelivery(orderId, {
      id: userAuth.id,
      rol: userAuth.rol,
    });

    return NextResponse.json({
      message: "Pedido confirmado para entrega exitosamente.",
      order,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al confirmar pedido para entrega",
      logLabel: "POST orders/confirm-for-delivery error:",
    });
  }
}
