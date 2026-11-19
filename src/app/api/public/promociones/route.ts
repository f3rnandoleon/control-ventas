import { NextResponse } from "next/server";
import { listPublicActiveWebPromotions } from "@/modules/promotions/application/promotions.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET() {
  try {
    const promociones = await listPublicActiveWebPromotions();
    return NextResponse.json(promociones);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener promociones activas",
      logLabel: "GET public/promociones error:",
    });
  }
}
