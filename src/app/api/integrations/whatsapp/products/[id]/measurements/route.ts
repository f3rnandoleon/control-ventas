import { NextResponse } from "next/server";
import {
  getWhatsAppProductMeasurements,
  verifyWhatsAppApiKey,
} from "@/modules/integrations/whatsapp/whatsapp.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    if (!verifyWhatsAppApiKey(request)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const resultado = await getWhatsAppProductMeasurements(id);

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al consultar medidas del producto",
      logLabel: "GET integrations/whatsapp/products/[id]/measurements error:",
    });
  }
}
