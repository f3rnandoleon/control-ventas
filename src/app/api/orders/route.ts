import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { listOrdersForActor } from "@/modules/orders/application/orders.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const orders = await listOrdersForActor(userAuth.role, userAuth.id);
    return NextResponse.json(orders);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener pedidos",
      logLabel: "GET orders error:",
    });
  }
}
