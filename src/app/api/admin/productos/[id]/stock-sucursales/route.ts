import { NextResponse } from "next/server";
import { getStockLevelsByProduct } from "@/modules/inventory/application/branch-stock.service";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const niveles = await getStockLevelsByProduct(id);

    return NextResponse.json(niveles);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener stock por sucursal del producto",
      logLabel: "GET /api/admin/productos/[id]/stock-sucursales error:",
    });
  }
}
