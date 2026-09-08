import { NextResponse } from "next/server";
import {
  uploadWhatsAppPaymentProof,
  verifyWhatsAppApiKey,
} from "@/modules/integrations/whatsapp/whatsapp.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = { params: Promise<{ paymentId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    if (!verifyWhatsAppApiKey(request)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { paymentId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "El archivo del comprobante es obligatorio" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "El archivo debe ser una imagen" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "El archivo no puede superar 5 MB" },
        { status: 400 }
      );
    }

    const result = await uploadWhatsAppPaymentProof(paymentId, file);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al subir el comprobante de pago por WhatsApp",
      logLabel: "POST integrations/whatsapp/payments/[paymentId]/proof error:",
    });
  }
}
