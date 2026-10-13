import { NextResponse } from "next/server";
import {
  obtenerCompraPorId,
  anularCompra,
} from "@/modules/purchases/application/compras.service";
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    let motivo: string | undefined;
    try {
      const body = await request.json();
      motivo = body.motivo;
    } catch {
      // Si no viene body json
    }

    const compraAnulada = await anularCompra(id, auth.userAuth.id, motivo);
    return NextResponse.json({
      message: "Compra anulada exitosamente. Stock y egresos monetarios revertidos.",
      compra: compraAnulada,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al anular compra",
      logLabel: "COMPRA DELETE/ANULAR ERROR:",
    });
  }
}
