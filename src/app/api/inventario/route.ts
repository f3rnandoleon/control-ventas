import { NextResponse } from "next/server";
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
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

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
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(ajusteStockSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { movimiento } = await adjustInventoryStock({
      ...validation.data,
      userIdRaw: auth.userAuth.id,
      rolActor: "ADMIN",
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
