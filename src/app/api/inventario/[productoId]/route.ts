import { NextResponse } from "next/server";
import { listInventoryMovementsByProduct } from "@/modules/inventory/application/inventory.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productoId: string }> }
) {
  try {
    const { productoId } = await params;
    const movimientos = await listInventoryMovementsByProduct(productoId);
    return NextResponse.json(movimientos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener kardex",
      logLabel: "GET inventario error:",
    });
  }
}
