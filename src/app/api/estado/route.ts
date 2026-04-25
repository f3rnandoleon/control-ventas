import { NextResponse } from "next/server";
import { getMongoRuntimeInfo } from "@/libs/mongodb";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET() {
  try {
    const mongo = await getMongoRuntimeInfo({ refresh: true });

    return NextResponse.json({
      estado:
        mongo.connected && mongo.transactionsSupported ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongo,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener el estado del sistema",
      logLabel: "ESTADO DEL SISTEMA ERROR:",
    });
  }
}
