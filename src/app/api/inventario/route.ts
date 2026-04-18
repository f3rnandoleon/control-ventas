import { NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { ajusteStockSchema } from "@/schemas/inventario.schema";
import {
  adjustInventoryStock,
  listInventoryMovements,
} from "@/modules/inventory/application/inventory.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function GET() {
  try {
    const movimientos = await listInventoryMovements();
    return NextResponse.json(movimientos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener inventario",
      logLabel: "INVENTARIO GET ERROR:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    const userIdRaw = headersList.get("x-user-id");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede ajustar inventario" },
        { status: 403 }
      );
    }

    if (!userIdRaw || !mongoose.Types.ObjectId.isValid(userIdRaw)) {
      return NextResponse.json(
        { message: "Usuario no autenticado" },
        { status: 401 }
      );
    }

    const validation = await validateRequest(ajusteStockSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { movimiento } = await adjustInventoryStock({
      ...validation.data,
      userIdRaw,
    });

    return NextResponse.json(
      { message: "Inventario actualizado correctamente", movimiento },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al ajustar inventario",
      logLabel: "INVENTARIO POST ERROR:",
    });
  }
}
