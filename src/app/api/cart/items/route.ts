import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { addCartItemSchema } from "@/schemas/cart.schema";
import { addCartItemByUserId } from "@/modules/cart/application/cart.service";
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

    const validation = await validateRequest(addCartItemSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const cart = await addCartItemByUserId(userAuth.id, validation.data);

    return NextResponse.json(
      {
        message: "Producto agregado al carrito",
        cart,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al agregar item al carrito",
      logLabel: "POST cart/items error:",
    });
  }
}
