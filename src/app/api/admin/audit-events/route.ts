import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { listAuditEvents } from "@/modules/audit/application/audit.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { resolveRequestId } from "@/shared/observability/request-id";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);

  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.rol !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = Number(searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 200)
      : 50;

    const events = await listAuditEvents(limit);

    return NextResponse.json(events, {
      status: 200,
      headers: {
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener eventos de auditoria",
      logLabel: "GET audit-events error:",
    });
  }
}
