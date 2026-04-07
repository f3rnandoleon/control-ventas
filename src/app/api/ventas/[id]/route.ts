import { NextResponse } from "next/server";
import { getSaleById } from "@/modules/sales/application/sales.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venta = await getSaleById(id);

    return NextResponse.json(venta);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener venta",
      logLabel: "GET venta/[id] error:",
    });
  }
}
