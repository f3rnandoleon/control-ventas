import { NextResponse } from "next/server";
import { headers } from "next/headers";
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

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
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
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    const userIdRaw = headersList.get("x-user-id");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede actualizar productos" },
        { status: 403 }
      );
    }

    if (!userIdRaw) {
      return NextResponse.json(
        { message: "Usuario no autenticado" },
        { status: 401 }
      );
    }

    const validation = await validateRequest(updateProductoSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const producto = await updateCatalogProduct(id, validation.data, userIdRaw);

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

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const headersList = await headers();
    const role = headersList.get("x-user-role");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede eliminar productos" },
        { status: 403 }
      );
    }

    await deleteCatalogProduct(id);

    return NextResponse.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar producto",
      logLabel: "DELETE producto error:",
    });
  }
}
