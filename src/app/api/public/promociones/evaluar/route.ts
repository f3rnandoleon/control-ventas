import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { evaluatePromotionsSchema } from "@/schemas/promocion.schema";
import { evaluateWebRawItemsPreview } from "@/modules/promotions/application/promotions.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);
    const validation = await validateRequest(evaluatePromotionsSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const result = await evaluateWebRawItemsPreview(
      validation.data,
      userAuth?.rol === "CLIENTE" ? userAuth.id : null
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al evaluar promociones",
      logLabel: "POST public/promociones/evaluar error:",
    });
  }
}
