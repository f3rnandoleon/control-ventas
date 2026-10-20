import { NextResponse } from "next/server";
import {
  searchWhatsAppProducts,
  verifyWhatsAppApiKey,
} from "@/modules/integrations/whatsapp/whatsapp.service";
import { whatsappProductSearchSchema } from "@/schemas/whatsapp-integration.schema";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!verifyWhatsAppApiKey(request)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawParams = {
      q: searchParams.get("q") || undefined,
      color: searchParams.get("color") || undefined,
      talla: searchParams.get("talla") || undefined,
      minPrecio: searchParams.get("minPrecio") || undefined,
      maxPrecio: searchParams.get("maxPrecio") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const parsedFilters = whatsappProductSearchSchema.parse(rawParams);
    const resultado = await searchWhatsAppProducts(parsedFilters);

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al buscar productos para WhatsApp",
      logLabel: "GET integrations/whatsapp/products/search error:",
    });
  }
}
