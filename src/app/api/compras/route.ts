import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { createCompraSchema } from "@/schemas/compra.schema";
import {
  registrarCompra,
  listarCompras,
} from "@/modules/purchases/application/compras.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const compras = await listarCompras({ page, limit });
    return NextResponse.json(compras);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener compras",
      logLabel: "COMPRAS GET ERROR:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(createCompraSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const compra = await registrarCompra(
      validation.data,
      auth.userAuth.id
    );

    return NextResponse.json(
      { message: "Compra registrada correctamente", compra },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al registrar compra",
      logLabel: "COMPRAS POST ERROR:",
    });
  }
}
