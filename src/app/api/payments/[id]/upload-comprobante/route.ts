import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { uploadFileToCloudinary } from "@/libs/cloudinary";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { uploadComprobanteAndGenerateToken } from "@/modules/payments/application/payments.service";
import { sendTelegramMessage, escapeTelegramMd } from "@/libs/telegram";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/payments/:id/upload-comprobante
 * El cliente (CLIENTE) sube la imagen del comprobante QR.
 * - Acepta multipart/form-data con campo "file" (imagen, max 5 MB).
 * - Sube la imagen a Cloudinary en la carpeta "control-ventas/comprobantes".
 * - Genera un reviewToken único (UUID) y lo guarda en el PaymentTransaction.
 * - Envía una notificación automática al admin vía Telegram con el link de verificación.
 */
export async function POST(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);
    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    if (userAuth.role !== "CLIENTE") {
      return NextResponse.json(
        { message: "Solo clientes pueden subir comprobantes" },
        { status: 403 }
      );
    }

    const { id: paymentId } = await context.params;

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

    const comprobanteUrl = await uploadFileToCloudinary(
      file,
      "control-ventas/comprobantes"
    );

    const { payment, reviewToken } = await uploadComprobanteAndGenerateToken(
      paymentId,
      comprobanteUrl,
      userAuth.id
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://control-ventas-azure.vercel.app";
    const verifyLink = `${appUrl}/verificar/pago/${reviewToken}`;

    // 🤖 Notificación automática al admin vía Telegram
    const montoEscapado = escapeTelegramMd(`Bs ${payment.amount?.toFixed(2) ?? "0.00"}`);
    const pagoEscapado = escapeTelegramMd(payment.paymentNumber ?? paymentId);
    const linkEscapado = escapeTelegramMd(verifyLink);

    await sendTelegramMessage(
      `🔔 *NUEVO COMPROBANTE POR VERIFICAR*\n\n` +
      `💳 Pago: \`${pagoEscapado}\`\n` +
      `💰 Monto: *${montoEscapado}*\n\n` +
      `📋 [Ver comprobante y procesar](${linkEscapado})\n\n` +
      `_Este link es de un solo uso\\._`
    );

    return NextResponse.json(
      {
        message: "Comprobante subido correctamente. El administrador fue notificado.",
        comprobanteUrl: payment.comprobanteUrl,
        verifyLink,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al subir el comprobante",
      logLabel: "POST payments/upload-comprobante error:",
    });
  }
}
