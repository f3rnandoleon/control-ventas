import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { getMyPosSummary } from "@/modules/pos/application/pos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const summary = await getMyPosSummary(userAuth);
    return NextResponse.json(summary);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener resumen POS",
      logLabel: "GET pos/summary error:",
    });
  }
}
