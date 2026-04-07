import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { getOpsOverview } from "@/modules/ops/application/ops.service";
import { resolveRequestId } from "@/shared/observability/request-id";
import { logInfo } from "@/shared/observability/logger";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);

  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const overview = await getOpsOverview();

    logInfo({
      message: "Consulta de overview operativo",
      context: "admin.ops.overview",
      requestId,
      data: {
        actorId: userAuth.id,
        alerts: overview.alerts.length,
      },
    });

    return NextResponse.json(
      {
        requestId,
        ...overview,
      },
      {
        status: 200,
        headers: {
          "x-request-id": requestId,
        },
      }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener el overview operativo",
      logLabel: "GET admin ops overview error:",
    });
  }
}
