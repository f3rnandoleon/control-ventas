import { NextResponse } from "next/server";
import { getPublicCatalog } from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET() {
  try {
    const productos = await getPublicCatalog();
    return NextResponse.json(productos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener catálogo público",
      logLabel: "GET productos/publicos error:",
    });
  }
}
