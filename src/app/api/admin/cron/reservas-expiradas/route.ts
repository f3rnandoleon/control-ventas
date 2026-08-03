import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/modules/orders/application/pedidos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const startedAt = Date.now();
    const result = await releaseExpiredReservations();

    return NextResponse.json({
      message: "Proceso de liberacion de reservas completado",
      ...result,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en el cron de reservas expiradas",
      logLabel: "CRON RESERVAS ERROR:",
    });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
