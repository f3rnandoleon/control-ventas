import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { updateCuponSchema } from "@/schemas/promocion.schema";
import {
  deleteAdminCupon,
  updateAdminCupon,
} from "@/modules/promotions/application/promotions.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(updateCuponSchema, request);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { id } = await context.params;
    const updated = await updateAdminCupon(id, validation.data);
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar cupón",
      logLabel: "PATCH admin/cupones/[id] error:",
    });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    await deleteAdminCupon(id);
    return NextResponse.json({ message: "Cupón eliminado correctamente" });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar cupón",
      logLabel: "DELETE admin/cupones/[id] error:",
    });
  }
}
