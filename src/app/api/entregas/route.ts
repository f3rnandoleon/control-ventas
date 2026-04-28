import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { createFulfillmentSchema } from "@/schemas/fulfillment.schema";
import { createOrSyncFulfillmentForOrder } from "@/modules/fulfillment/application/fulfillment.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (!["ADMIN", "VENDEDOR"].includes(userAuth.rol)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const validation = await validateRequest(createFulfillmentSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const entrega = await createOrSyncFulfillmentForOrder(
      validation.data.pedidoId,
      validation.data
    );

    return NextResponse.json(
      {
        message: "Entrega sincronizada correctamente",
        entrega,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear la entrega",
      logLabel: "POST entregas error:",
    });
  }
}
