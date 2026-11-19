import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { toggleAdminPromocion } from "@/modules/promotions/application/promotions.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const updated = await toggleAdminPromocion(id);
    return NextResponse.json({
      message:
        updated.estado === "ACTIVA"
          ? "Promoción activada correctamente"
          : "Promoción pausada correctamente",
      promocion: updated,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al cambiar estado de promoción",
      logLabel: "PATCH admin/promociones/[id]/toggle error:",
    });
  }
}
