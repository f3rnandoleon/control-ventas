import { NextResponse } from "next/server";
import { getPublicCatalogProductById } from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const producto = await getPublicCatalogProductById(id);
    return NextResponse.json(producto);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener producto público",
      logLabel: "GET productos/publicos/:id error:",
    });
  }
}
