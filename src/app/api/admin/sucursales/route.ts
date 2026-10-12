import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Sucursal from "@/models/sucursal";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    await connectDB();
    const sucursales = await Sucursal.find().sort({ esAlmacenPrincipal: -1, nombre: 1 }).lean();
    return NextResponse.json(sucursales);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar sucursales",
      logLabel: "SUCURSALES GET ERROR:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    await connectDB();

    const sucursal = await Sucursal.create(body);
    return NextResponse.json(sucursal, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear sucursal",
      logLabel: "SUCURSALES POST ERROR:",
    });
  }
}
