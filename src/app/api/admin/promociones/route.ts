import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { createPromocionSchema } from "@/schemas/promocion.schema";
import {
  createAdminPromocion,
  listAdminPromociones,
} from "@/modules/promotions/application/promotions.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") || undefined;
    const metodoActivacion = searchParams.get("metodoActivacion") || undefined;

    const promociones = await listAdminPromociones({ estado, metodoActivacion });
    return NextResponse.json(promociones);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar promociones",
      logLabel: "GET admin/promociones error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(createPromocionSchema, request);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const created = await createAdminPromocion(validation.data, auth.userAuth.id);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear promoción",
      logLabel: "POST admin/promociones error:",
    });
  }
}
