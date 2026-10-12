import { NextResponse } from "next/server";
import {
  obtenerTraspasoPorId,
  cancelarTraspaso,
} from "@/modules/transfers/application/transfers.service";
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
    const traspaso = await obtenerTraspasoPorId(id);
    return NextResponse.json(traspaso);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener traspaso",
      logLabel: "TRASPASO GET ERROR:",
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
    const traspaso = await cancelarTraspaso(id, auth.userAuth.id);
    return NextResponse.json(traspaso);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al cancelar traspaso",
      logLabel: "TRASPASO DELETE ERROR:",
    });
  }
}
