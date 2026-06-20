import { NextResponse } from "next/server";
import { findCatalogProductByCode } from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

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
