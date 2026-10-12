import { NextResponse } from "next/server";
import { obtenerCompraPorId } from "@/modules/purchases/application/compras.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const compra = await obtenerCompraPorId(id);
    return NextResponse.json(compra);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener detalle de la compra",
      logLabel: "COMPRA DETAIL GET ERROR:",
    });
  }
}
