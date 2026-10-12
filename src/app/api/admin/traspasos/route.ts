import { NextResponse } from "next/server";
import {
  crearSolicitudTraspaso,
  listarTraspasos,
} from "@/modules/transfers/application/transfers.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") || undefined;
    const sucursalId = searchParams.get("sucursalId") || undefined;

    const traspasos = await listarTraspasos({ estado, sucursalId });
    return NextResponse.json(traspasos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar traspasos",
      logLabel: "TRASPASOS GET ERROR:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const traspaso = await crearSolicitudTraspaso(body, auth.userAuth.id);
    return NextResponse.json(traspaso, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear traspaso",
      logLabel: "TRASPASOS POST ERROR:",
    });
  }
}
