import { NextResponse } from "next/server";
import { findCatalogProductByCode } from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const producto = await findCatalogProductByCode(code);
    return NextResponse.json(producto);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error interno del servidor",
      logLabel: "ERROR GET PRODUCTO BY CODE:",
    });
  }
}
