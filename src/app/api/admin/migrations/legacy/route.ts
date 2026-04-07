import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  getLegacyMigrationStatus,
  runLegacyMigration,
} from "@/modules/migrations/application/legacy-migration.service";
import { runLegacyMigrationSchema } from "@/schemas/legacy-migration.schema";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const status = await getLegacyMigrationStatus();
    return NextResponse.json(status);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener el estado de migracion legacy",
      logLabel: "GET legacy migration status error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsedBody = runLegacyMigrationSchema.parse(body);
    const result = await runLegacyMigration(parsedBody);

    return NextResponse.json(result, {
      status: parsedBody.dryRun ? 200 : 201,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Datos invalidos",
          errors: formatZodError(error),
        },
        { status: 400 }
      );
    }

    return handleRouteError(error, {
      fallbackMessage: "Error al ejecutar la migracion legacy",
      logLabel: "POST legacy migration error:",
    });
  }
}
