import { NextResponse } from "next/server";
import { getKardexPorProducto } from "@/modules/inventory/application/kardex.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productoId: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { productoId } = await params;
    const { searchParams } = new URL(request.url);
    const varianteId = searchParams.get("varianteId") || undefined;
    const sucursalId = searchParams.get("sucursalId") || undefined;

    const kardexDetalle = await getKardexPorProducto(productoId, varianteId, sucursalId);
    return NextResponse.json(kardexDetalle);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener kardex del producto",
      logLabel: "KARDEX PRODUCTO GET ERROR:",
    });
  }
}
