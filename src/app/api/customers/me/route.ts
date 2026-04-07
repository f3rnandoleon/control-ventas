import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { updateCustomerProfileSchema } from "@/schemas/customer.schema";
import {
  getCustomerContextByUserId,
  updateCustomerProfileByUserId,
} from "@/modules/customers/application/customers.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const customer = await getCustomerContextByUserId(userAuth.id, {
      ensureProfile: true,
    });

    return NextResponse.json(customer);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener perfil de cliente",
      logLabel: "GET customers/me error:",
    });
  }
}

export async function PUT(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(updateCustomerProfileSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const customer = await updateCustomerProfileByUserId(
      userAuth.id,
      validation.data
    );

    return NextResponse.json(customer);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar perfil de cliente",
      logLabel: "PUT customers/me error:",
    });
  }
}
