import { NextResponse } from "next/server";
import { getPublicRelatedProducts } from "@/modules/catalog/application/catalog.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const data = await getPublicRelatedProducts(id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener productos relacionados",
      logLabel: "GET productos/publicos/:id/relacionados error:",
    });
  }
}

