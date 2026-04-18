import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { runCoreEndToEndVerification } from "@/modules/ops/application/core-verification.service";
import { runCoreVerificationSchema } from "@/schemas/core-verification.schema";
import { resolveRequestId } from "@/shared/observability/request-id";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);

  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = runCoreVerificationSchema.parse(body);
    const result = await runCoreEndToEndVerification(
      {
        id: userAuth.id,
        role: userAuth.role,
      },
      parsed,
      requestId
    );

    return NextResponse.json(result, {
      status: 201,
      headers: {
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Datos invalidos",
          errors: formatZodError(error),
          requestId,
        },
        { status: 400 }
      );
    }

    return handleRouteError(error, {
      fallbackMessage: "Error al ejecutar la verificacion E2E del core",
      logLabel: "POST verify-core error:",
    });
  }
}
