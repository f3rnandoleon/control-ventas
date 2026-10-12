import { NextResponse } from "next/server";
import { recibirTraspaso } from "@/modules/transfers/application/transfers.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const traspaso = await recibirTraspaso(
      {
        traspasoId: id,
        itemsRecibidos: body.itemsRecibidos,
        notas: body.notas,
      },
      auth.userAuth.id
    );

    return NextResponse.json(traspaso);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al recibir traspaso",
      logLabel: "TRASPASO RECIBIR ERROR:",
    });
  }
}
