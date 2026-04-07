import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { createCustomerAddressSchema } from "@/schemas/customer.schema";
import {
  createCustomerAddressByUserId,
  listCustomerAddressesByUserId,
} from "@/modules/customers/application/customers.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const addresses = await listCustomerAddressesByUserId(userAuth.id);
    return NextResponse.json(addresses);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener direcciones",
      logLabel: "GET customers/me/addresses error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(createCustomerAddressSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const address = await createCustomerAddressByUserId(
      userAuth.id,
      validation.data
    );

    return NextResponse.json(
      {
        message: "Direccion creada correctamente",
        address,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear direccion",
      logLabel: "POST customers/me/addresses error:",
    });
  }
}
