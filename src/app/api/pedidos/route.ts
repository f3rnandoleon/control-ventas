import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  listPedidosForActor,
  listRecognizedSalesForActor,
} from "@/modules/orders/application/pedidos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const orders =
      scope === "sales"
        ? await listRecognizedSalesForActor(userAuth.rol, userAuth.id)
        : await listPedidosForActor(userAuth.rol, userAuth.id);

    return NextResponse.json(orders);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener pedidos",
      logLabel: "GET orders error:",
    });
  }
}
