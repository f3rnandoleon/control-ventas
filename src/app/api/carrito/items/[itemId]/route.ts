import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { updateCartItemSchema } from "@/schemas/cart.schema";
import {
  removeCartItemByUserId,
  updateCartItemByUserId,
} from "@/modules/cart/application/cart.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ itemId: string }>;
};

export async function PUT(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (userAuth.rol !== "CLIENTE") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const validation = await validateRequest(updateCartItemSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { itemId } = await context.params;
    const cart = await updateCartItemByUserId(userAuth.id, itemId, validation.data);

    return NextResponse.json({
      message: "Carrito actualizado correctamente",
      cart,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar item del carrito",
      logLabel: "PUT cart/items/[itemId] error:",
    });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (userAuth.rol !== "CLIENTE") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const { itemId } = await context.params;
    const cart = await removeCartItemByUserId(userAuth.id, itemId);

    return NextResponse.json({
      message: "Item eliminado del carrito",
      cart,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar item del carrito",
      logLabel: "DELETE cart/items/[itemId] error:",
    });
  }
}
