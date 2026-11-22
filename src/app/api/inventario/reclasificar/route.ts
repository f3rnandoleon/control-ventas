import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { reclasificarVarianteSchema } from "@/schemas/inventario.schema";
import { reclassifyInventoryVariant } from "@/modules/inventory/application/inventory.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const validation = await validateRequest(reclasificarVarianteSchema, request);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const result = await reclassifyInventoryVariant({
      ...validation.data,
      userIdRaw: auth.userAuth.id,
      rolActor: "ADMIN",
    });

    return NextResponse.json(
      {
        message: result.creadaNuevaVariante
          ? "Nueva variante creada y prendas reclasificadas correctamente"
          : "Prendas reclasificadas correctamente",
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al reclasificar variante de inventario",
      logLabel: "INVENTARIO RECLASIFICAR POST ERROR:",
    });
  }
}
