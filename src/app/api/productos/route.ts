import { NextResponse } from "next/server";
import { headers } from "next/headers";
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

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
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
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    const userId = headersList.get("x-user-id");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede crear productos" },
        { status: 403 }
      );
    }

    const validation = await validateRequest(createProductoSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const producto = await createCatalogProduct(validation.data, userId);

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
