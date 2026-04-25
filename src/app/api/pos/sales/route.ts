import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { createPosSaleSchema } from "@/schemas/pos.schema";
import { createPosSale } from "@/modules/pos/application/pos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(createPosSaleSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const pedido = await createPosSale(userAuth, validation.data);

    return NextResponse.json(
      {
        message: "Venta POS registrada correctamente",
        pedido,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al registrar venta POS",
      logLabel: "POST pos/sales error:",
    });
  }
}
