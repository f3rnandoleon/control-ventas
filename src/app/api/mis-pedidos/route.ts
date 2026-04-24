import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { listPedidosForActor } from "@/modules/orders/application/pedidos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.rol !== "CLIENTE") {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    const userId = userAuth.id;
    const orders = await listPedidosForActor("CLIENTE", userId);

    return NextResponse.json(orders);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener mis pedidos",
      logLabel: "GET mis-pedidos error:",
    });
  }
}
