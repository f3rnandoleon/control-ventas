import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { applyCouponSchema } from "@/schemas/promocion.schema";
import {
  applyCouponToCartByUserId,
  removeCouponFromCartByUserId,
} from "@/modules/cart/application/cart.service";
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

    const validation = await validateRequest(applyCouponSchema, request);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const cart = await applyCouponToCartByUserId(userAuth.id, validation.data.codigo);
    return NextResponse.json({
      message: `Cupón ${validation.data.codigo} aplicado correctamente`,
      cart,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al aplicar cupón al carrito",
      logLabel: "POST carrito/cupon error:",
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);
    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    if (userAuth.rol !== "CLIENTE") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const cart = await removeCouponFromCartByUserId(userAuth.id);
    return NextResponse.json({
      message: "Cupón removido del carrito",
      cart,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al remover cupón del carrito",
      logLabel: "DELETE carrito/cupon error:",
    });
  }
}
