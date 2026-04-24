import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { getPedidoForActor } from "@/modules/orders/application/pedidos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);
    const { id } = await context.params;

    if (!userAuth || userAuth.rol !== "CLIENTE") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const order = await getPedidoForActor("CLIENTE", userAuth.id, id);
    return NextResponse.json(order);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener pedido",
      logLabel: "GET mis-pedidos/[id] error:",
    });
  }
}
