import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { uploadFileToCloudinary } from "@/libs/cloudinary";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { isAppError } from "@/shared/errors/AppError";
import {
  uploadComprobanteAndGenerateToken,
  validatePaymentBeforeProofUpload,
} from "@/modules/payments/application/payments.service";
import { sendTelegramMessage, escapeTelegramMd } from "@/libs/telegram";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/pagos/:id/upload-comprobante
 * El cliente (autenticado o invitado) sube la imagen del comprobante QR
 * y se genera un token de revisión para el staff.
 */
export async function POST(request: Request, context: Context) {
  try {
    const { id: paymentId } = await context.params;
    const userAuth = await resolveApiAuth(request);

    if (userAuth && userAuth.rol !== "CLIENTE") {
      return NextResponse.json(
        { ok: false, message: "Solo clientes pueden subir comprobantes" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawReservationToken =
      (formData.get("reservationToken") as string | null) ||
      request.headers.get("x-reservation-token") ||
      null;
    const reservationToken = rawReservationToken?.trim() || null;

    if (!file) {
      return NextResponse.json(
        { ok: false, message: "El archivo del comprobante es obligatorio" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "El archivo debe ser una imagen" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, message: "El archivo no puede superar 5 MB" },
        { status: 400 }
      );
    }

    const actorId = userAuth?.id || "INVITADO";

    // Validar estado del pago, permisos y vigencia de la reserva ANTES de subir a Cloudinary
    await validatePaymentBeforeProofUpload(paymentId, actorId, reservationToken);

    const comprobanteUrl = await uploadFileToCloudinary(
      file,
      "control-ventas/comprobantes"
    );

    const { payment, pedido, tokenRevision } =
      await uploadComprobanteAndGenerateToken(
        paymentId,
        comprobanteUrl,
        actorId,
        reservationToken
      );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://control-ventas-azure.vercel.app";
    const verifyLink = `${appUrl}/verificar/pago/${tokenRevision}`;

    const montoEscapado = escapeTelegramMd(
      `Bs ${payment.monto?.toFixed(2) ?? "0.00"}`
    );
    const pagoEscapado = escapeTelegramMd(payment.numeroPago ?? paymentId);
    const pedidoEscapado = escapeTelegramMd(pedido.numeroPedido ?? "");
    const clienteNombre =
      pedido.snapshotCliente?.nombreCompleto ||
      pedido.snapshotEntrega?.nombreDestinatario ||
      "Cliente";
    const clienteTelefono =
      pedido.snapshotCliente?.telefono ||
      pedido.snapshotEntrega?.telefono ||
      pedido.snapshotEntrega?.telefonoRemitente ||
      "No especificado";
    const departamento =
      pedido.snapshotEntrega?.departamento ||
      (pedido.snapshotEntrega?.metodo === "WHATSAPP" ? "La Paz" : null) ||
      pedido.snapshotEntrega?.metodo ||
      "No especificado";
    const envioTexto =
      pedido.costoEnvio && pedido.costoEnvio > 0
        ? ` \\(incluye envío Bs ${escapeTelegramMd(pedido.costoEnvio.toFixed(2))}\\)`
        : "";
    const linkEscapado = escapeTelegramMd(verifyLink);

    try {
      await sendTelegramMessage(
        `🔔 *NUEVO COMPROBANTE POR VERIFICAR*\n\n` +
          `📦 Pedido: \`${pedidoEscapado}\`\n` +
          `💳 Pago: \`${pagoEscapado}\`\n` +
          `👤 Cliente: *${escapeTelegramMd(clienteNombre)}*\n` +
          `📱 Celular: \`${escapeTelegramMd(clienteTelefono)}\`\n` +
          `📍 Departamento: *${escapeTelegramMd(departamento)}*\n` +
          `💰 Monto: *${montoEscapado}*${envioTexto}\n\n` +
          `📋 [Ver comprobante y procesar](${linkEscapado})\n\n` +
          `_Este link es de un solo uso\\._`
      );
    } catch (tgError) {
      console.error("[Telegram] Error al enviar notificación de comprobante:", tgError);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Comprobante subido correctamente. El administrador fue notificado.",
        urlComprobante: payment.urlComprobante,
        orderId: pedido._id.toString(),
        orderNumber: pedido.numeroPedido,
      },
      { status: 201 }
    );
  } catch (error) {
    if (isAppError(error) && error.code === "RESERVATION_EXPIRED") {
      return NextResponse.json(
        {
          ok: false,
          code: "RESERVATION_EXPIRED",
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    return handleRouteError(error, {
      fallbackMessage: "Error al subir el comprobante",
      logLabel: "POST pagos/upload-comprobante error:",
    });
  }
}
