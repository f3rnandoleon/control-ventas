import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { listPromocionUsos } from "@/modules/promotions/application/promotions.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const usos = await listPromocionUsos(id);
    return NextResponse.json(usos);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al consultar usos de la promoción",
      logLabel: "GET admin/promociones/[id]/usos error:",
    });
  }
}
