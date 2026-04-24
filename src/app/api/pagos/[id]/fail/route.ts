import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { failPaymentSchema } from "@/schemas/payment.schema";
import { failPaymentTransaction } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(failPaymentSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { id } = await context.params;
    const result = await failPaymentTransaction(userAuth, id, validation.data);

    return NextResponse.json({
      message: "Pago marcado como fallido",
      ...result,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al registrar fallo de pago",
      logLabel: "POST payments/[id]/fail error:",
    });
  }
}
