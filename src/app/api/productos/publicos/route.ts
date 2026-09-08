import { NextResponse } from "next/server";
import { getPublicCatalog } from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const categoria = searchParams.get("categoria") || undefined;
    const color = searchParams.get("color") || undefined;
    const talla = searchParams.get("talla") || undefined;
    const soloDisponible = searchParams.get("soloDisponible") === "true";
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const productos = await getPublicCatalog({
      q,
      categoria,
      color,
      talla,
      soloDisponible,
      page,
      limit,
    });

    return NextResponse.json(productos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener catálogo público",
      logLabel: "GET productos/publicos error:",
    });
  }
}
