import { NextResponse } from "next/server";
import { updateProductoSchema } from "@/schemas/producto.schema";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import {
  deleteCatalogProduct,
  getCatalogProductById,
  updateCatalogProduct,
} from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const producto = await getCatalogProductById(id);
    return NextResponse.json(producto);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener producto",
      logLabel: "GET producto error:",
    });
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(updateProductoSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const producto = await updateCatalogProduct(id, validation.data, auth.userAuth.id);

    return NextResponse.json({
      message: "Producto actualizado correctamente",
      producto,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar producto",
      logLabel: "PUT productos error:",
    });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    await deleteCatalogProduct(id);

    return NextResponse.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar producto",
      logLabel: "DELETE producto error:",
    });
  }
}
