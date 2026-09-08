import { NextResponse } from "next/server";
import {
  createWhatsAppOrder,
  verifyWhatsAppApiKey,
} from "@/modules/integrations/whatsapp/whatsapp.service";
import { createWhatsAppOrderSchema } from "@/schemas/whatsapp-integration.schema";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!verifyWhatsAppApiKey(request)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsedInput = createWhatsAppOrderSchema.parse(body);

    const result = await createWhatsAppOrder(parsedInput);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear el pedido por WhatsApp",
      logLabel: "POST integrations/whatsapp/orders error:",
    });
  }
}
