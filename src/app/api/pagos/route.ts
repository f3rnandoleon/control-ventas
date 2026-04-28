import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { createPaymentTransactionSchema } from "@/schemas/payment.schema";
import { createPaymentTransaction } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(createPaymentTransactionSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const payment = await createPaymentTransaction(userAuth, validation.data);

    return NextResponse.json(
      {
        message: "Transaccion de pago creada correctamente",
        payment,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear transaccion de pago",
      logLabel: "POST payments error:",
    });
  }
}
