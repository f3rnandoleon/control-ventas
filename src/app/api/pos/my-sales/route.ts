import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { listMyPosSales } from "@/modules/pos/application/pos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const sales = await listMyPosSales(userAuth);
    return NextResponse.json(sales);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener ventas POS",
      logLabel: "GET pos/my-sales error:",
    });
  }
}
