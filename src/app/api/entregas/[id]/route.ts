import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { getFulfillmentByOrderForActor } from "@/modules/fulfillment/application/fulfillment.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const entrega = await getFulfillmentByOrderForActor(
      userAuth.rol,
      userAuth.id,
      id
    );

    return NextResponse.json(entrega);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener la entrega",
      logLabel: "GET entregas/[id] error:",
    });
  }
}
