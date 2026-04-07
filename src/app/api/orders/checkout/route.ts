import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { checkoutCartSchema } from "@/schemas/cart.schema";
import { checkoutCartToOrder } from "@/modules/orders/application/orders.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (userAuth.role !== "CLIENTE") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const validation = await validateRequest(checkoutCartSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const order = await checkoutCartToOrder(userAuth.id, validation.data);

    return NextResponse.json(
      {
        message: "Pedido creado correctamente desde el carrito",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear pedido desde el carrito",
      logLabel: "POST orders/checkout error:",
    });
  }
}
