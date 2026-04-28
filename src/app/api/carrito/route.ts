import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  clearCartByUserId,
  getCartByUserId,
} from "@/modules/cart/application/cart.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (userAuth.rol !== "CLIENTE") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const cart = await getCartByUserId(userAuth.id);
    return NextResponse.json(cart);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener carrito",
      logLabel: "GET cart error:",
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

    const cart = await clearCartByUserId(userAuth.id);
    return NextResponse.json({
      message: "Carrito vaciado correctamente",
      cart,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al vaciar carrito",
      logLabel: "DELETE cart error:",
    });
  }
}
