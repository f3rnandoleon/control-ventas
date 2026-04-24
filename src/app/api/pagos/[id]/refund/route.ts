import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { refundPaymentSchema } from "@/schemas/payment.schema";
import { refundPaymentTransaction } from "@/modules/payments/application/payments.service";
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

    const validation = await validateRequest(refundPaymentSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { id } = await context.params;
    const result = await refundPaymentTransaction(userAuth, id, validation.data);

    return NextResponse.json({
      message: "Pago reembolsado correctamente",
      ...result,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al reembolsar pago",
      logLabel: "POST payments/[id]/refund error:",
    });
  }
}
