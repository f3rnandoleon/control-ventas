import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { updateCustomerAddressSchema } from "@/schemas/customer.schema";
import {
  deleteCustomerAddressByUserId,
  updateCustomerAddressByUserId,
} from "@/modules/customers/application/customers.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(updateCustomerAddressSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { addressId } = await params;

    const address = await updateCustomerAddressByUserId(
      userAuth.id,
      addressId,
      validation.data
    );

    return NextResponse.json({
      message: "Direccion actualizada correctamente",
      address,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar direccion",
      logLabel: "PUT customers/me/addresses/[addressId] error:",
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const { addressId } = await params;
    const result = await deleteCustomerAddressByUserId(userAuth.id, addressId);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar direccion",
      logLabel: "DELETE customers/me/addresses/[addressId] error:",
    });
  }
}
