import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { updateFulfillmentStatusSchema } from "@/schemas/fulfillment.schema";
import { updateFulfillmentStatusById } from "@/modules/fulfillment/application/fulfillment.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (!["ADMIN", "VENDEDOR"].includes(userAuth.rol)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const validation = await validateRequest(
      updateFulfillmentStatusSchema,
      request
    );

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { id } = await context.params;
    const result = await updateFulfillmentStatusById(id, validation.data);

    return NextResponse.json({
      message: "Fulfillment actualizado correctamente",
      ...result,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar fulfillment",
      logLabel: "PATCH fulfillment status error:",
    });
  }
}
