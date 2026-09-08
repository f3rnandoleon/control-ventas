import { NextResponse } from "next/server";
import {
  getWhatsAppOrderStatus,
  verifyWhatsAppApiKey,
} from "@/modules/integrations/whatsapp/whatsapp.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = { params: Promise<{ numeroPedido: string }> };

export async function GET(request: Request, context: Context) {
  try {
    if (!verifyWhatsAppApiKey(request)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { numeroPedido } = await context.params;
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone?.trim()) {
      return NextResponse.json(
        { message: "El parámetro phone es requerido" },
        { status: 400 }
      );
    }

    const statusData = await getWhatsAppOrderStatus(numeroPedido, phone);

    return NextResponse.json(statusData);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al consultar estado del pedido",
      logLabel: "GET integrations/whatsapp/orders/[numeroPedido] error:",
    });
  }
}
