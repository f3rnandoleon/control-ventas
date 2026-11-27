import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { checkoutCartSchema } from "@/schemas/cart.schema";
import {
  crearPedidoCheckout,
  sanitizePedidoForCustomer,
} from "@/modules/orders/application/pedidos.service";
import { sendTelegramMessage, escapeTelegramMd } from "@/libs/telegram";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);
    const validation = await validateRequest(checkoutCartSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const payload = validation.data;
    const isGuest = Boolean(payload.esInvitado || payload.clienteInvitado);

    if (!userAuth) {
      if (!isGuest) {
        return NextResponse.json({ message: "No autenticado" }, { status: 401 });
      }
    } else {
      if (userAuth.rol !== "CLIENTE") {
        return NextResponse.json({ message: "No autorizado" }, { status: 403 });
      }
    }

    const { pedido, pago, reservationToken } = await crearPedidoCheckout(
      userAuth ? userAuth.id : null,
      payload
    );

    // Notificación Telegram inmediata solo para pedidos NO-QR (efectivo / coordinación sin pago QR).
    // Los pedidos QR notifican a Telegram cuando el cliente sube el comprobante.
    const isEfectivo = payload.metodoPago === "EFECTIVO";
    const isWhatsappNonQr =
      payload.entrega?.metodo === "WHATSAPP" && payload.metodoPago !== "QR";

    if (isEfectivo || isWhatsappNonQr) {
      try {
        const pedidoEscapado = escapeTelegramMd(pedido.numeroPedido);
        const montoEscapado = escapeTelegramMd(`Bs ${pedido.total.toFixed(2)}`);
        const clienteEscapado = escapeTelegramMd(
          pedido.snapshotCliente?.nombreCompleto || payload.clienteInvitado?.nombreCompleto || "Cliente Invitado"
        );
        const metodoPagoEscapado = escapeTelegramMd(pedido.metodoPago);
        const metodoEntregaEscapado = escapeTelegramMd(payload.entrega?.metodo || "No especificado");
        const canalEscapado = isGuest ? " \\(Invitado WEB\\)" : "";

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://control-ventas-azure.vercel.app";
        const adminLink = `${appUrl}/dashboard/admin/pedidos`;

        await sendTelegramMessage(
          `🆕 *NUEVO PEDIDO RECIBIDO${canalEscapado}*\n\n` +
          `📦 Pedido: \`${pedidoEscapado}\`\n` +
          `👤 Cliente: *${clienteEscapado}*\n` +
          `💰 Total: *${montoEscapado}*\n\n` +
          `💳 Pago: *${metodoPagoEscapado}*\n` +
          `🚚 Entrega: *${metodoEntregaEscapado}*\n\n` +
          `📋 [Ver detalle del pedido](${adminLink})`
        );
      } catch (tgError) {
        console.error("[Telegram] Error al enviar notificación desde el endpoint:", tgError);
      }
    }

    const pedidoRaw =
      typeof pedido.toObject === "function" ? pedido.toObject() : pedido;
    const pedidoSanitizado = sanitizePedidoForCustomer(
      pedidoRaw as unknown as Record<string, unknown>
    );

    return NextResponse.json(
      {
        ok: true,
        orderId: pedido._id.toString(),
        orderNumber: pedido.numeroPedido,
        codigo: pedido.numeroPedido,
        paymentId: pago ? pago._id.toString() : null,
        expiresAt: pedido.reservaExpiraEn ? pedido.reservaExpiraEn.toISOString() : null,
        reservationToken,
        message: "Pedido creado correctamente",
        pedido: pedidoSanitizado,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear pedido desde el checkout",
      logLabel: "POST pedidos/checkout error:",
    });
  }
}
