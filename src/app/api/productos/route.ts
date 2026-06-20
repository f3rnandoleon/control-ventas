import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { createProductoSchema } from "@/schemas/producto.schema";
import {
  createCatalogProduct,
  listCatalog,
} from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const withStock = searchParams.get("withStock") === "true";

    const productos = await listCatalog(withStock);
    return NextResponse.json(productos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener productos",
      logLabel: "GET productos error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(createProductoSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const producto = await createCatalogProduct(validation.data, auth.userAuth.id);

    return NextResponse.json(
      { message: "Producto creado correctamente", producto },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear producto",
      logLabel: "POST productos error:",
    });
  }
}
