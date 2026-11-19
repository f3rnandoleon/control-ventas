import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { createCuponSchema } from "@/schemas/promocion.schema";
import {
  createAdminCupon,
  listAdminCupones,
} from "@/modules/promotions/application/promotions.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const promocionId = searchParams.get("promocionId") || undefined;

    const cupones = await listAdminCupones(promocionId);
    return NextResponse.json(cupones);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar cupones",
      logLabel: "GET admin/cupones error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(createCuponSchema, request);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const created = await createAdminCupon(validation.data, auth.userAuth.id);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear cupón",
      logLabel: "POST admin/cupones error:",
    });
  }
}
