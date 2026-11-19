import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { updatePromocionSchema } from "@/schemas/promocion.schema";
import {
  deleteAdminPromocion,
  getAdminPromocionById,
  updateAdminPromocion,
} from "@/modules/promotions/application/promotions.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const promo = await getAdminPromocionById(id);
    return NextResponse.json(promo);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener promoción",
      logLabel: "GET admin/promociones/[id] error:",
    });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(updatePromocionSchema, request);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { id } = await context.params;
    const updated = await updateAdminPromocion(id, validation.data);
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar promoción",
      logLabel: "PATCH admin/promociones/[id] error:",
    });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    await deleteAdminPromocion(id);
    return NextResponse.json({ message: "Promoción eliminada correctamente" });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar promoción",
      logLabel: "DELETE admin/promociones/[id] error:",
    });
  }
}
