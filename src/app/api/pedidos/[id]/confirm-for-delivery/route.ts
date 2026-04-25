import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { confirmPedidoForDelivery } from "@/modules/orders/application/pedidos.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/pedidos/:id/confirm-for-delivery
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

    const { id: pedidoId } = await context.params;
    const pedido = await confirmPedidoForDelivery(pedidoId, {
      id: userAuth.id,
      rol: userAuth.rol,
    });

    return NextResponse.json({
      message: "Pedido confirmado para entrega exitosamente.",
      pedido,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al confirmar pedido para entrega",
      logLabel: "POST pedidos/confirm-for-delivery error:",
    });
  }
}
