import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { confirmPaymentSchema } from "@/schemas/payment.schema";
import { confirmPaymentTransaction } from "@/modules/payments/application/payments.service";
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

    const validation = await validateRequest(confirmPaymentSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { id } = await context.params;
    const result = await confirmPaymentTransaction(userAuth, id, validation.data);

    return NextResponse.json({
      message: "Pago confirmado correctamente",
      ...result,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al confirmar pago",
      logLabel: "POST payments/[id]/confirm error:",
    });
  }
}
