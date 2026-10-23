import { NextResponse } from "next/server";
import { findCatalogProductByCode } from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { resolveApiAuth } from "@/libs/resolveApiAuth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const userAuth = await resolveApiAuth(request);
    const isStaff = Boolean(
      userAuth && ["ADMIN", "VENDEDOR"].includes(userAuth.rol)
    );

    const { code } = await context.params;
    const producto = await findCatalogProductByCode(code, !isStaff);
    return NextResponse.json(producto);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al buscar producto por código",
      logLabel: "ERROR GET PRODUCTO BY CODE:",
    });
  }
}
