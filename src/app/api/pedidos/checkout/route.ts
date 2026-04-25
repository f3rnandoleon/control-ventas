import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { checkoutCartSchema } from "@/schemas/cart.schema";
import { crearPedidoDesdeCarrito } from "@/modules/orders/application/pedidos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (userAuth.rol !== "CLIENTE") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const validation = await validateRequest(checkoutCartSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const pedido = await crearPedidoDesdeCarrito(userAuth.id, validation.data);

    return NextResponse.json(
      {
        message: "Pedido creado correctamente desde el carrito",
        pedido,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear pedido desde el carrito",
      logLabel: "POST pedidos/checkout error:",
    });
  }
}
