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
    const fulfillment = await getFulfillmentByOrderForActor(
      userAuth.role,
      userAuth.id,
      id
    );

    return NextResponse.json(fulfillment);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener fulfillment",
      logLabel: "GET fulfillment error:",
    });
  }
}
