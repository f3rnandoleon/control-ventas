import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/modules/orders/application/pedidos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("x-cron-secret");
    if (authHeader !== process.env.CRON_SECRET) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { releasedCount, details } = await releaseExpiredReservations();

    return NextResponse.json({
      message: "Proceso de liberación de reservas completado",
      releasedCount,
      details,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error en el cron de reservas expiradas",
      logLabel: "CRON RESERVAS ERROR:",
    });
  }
}
