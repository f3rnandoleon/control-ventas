import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { checkoutCartSchema } from "@/schemas/cart.schema";
import { crearPedidoDesdeCarrito } from "@/modules/orders/application/pedidos.service";
import { sendTelegramMessage, escapeTelegramMd } from "@/libs/telegram";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (userAuth.rol !== "CLIENTE") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const validation = await validateRequest(checkoutCartSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const payload = validation.data;
    const pedido = await crearPedidoDesdeCarrito(userAuth.id, payload);

    // Notificación Telegram para métodos que no requieren subir comprobante QR (Efectivo o WhatsApp)
    const isEfectivo = payload.metodoPago === "EFECTIVO";
    const isWhatsapp = payload.entrega?.metodo === "WHATSAPP";

    if (isEfectivo || isWhatsapp) {
      try {
        const pedidoEscapado = escapeTelegramMd(pedido.numeroPedido);
        const montoEscapado = escapeTelegramMd(`Bs ${pedido.total.toFixed(2)}`);
        const clienteEscapado = escapeTelegramMd(pedido.snapshotCliente.nombreCompleto);
        const metodoPagoEscapado = escapeTelegramMd(pedido.metodoPago);
        const metodoEntregaEscapado = escapeTelegramMd(payload.entrega?.metodo || "No especificado");

        const itemsText = pedido.items.length === 1 ? "1 producto" : `${pedido.items.length} productos`;
        const itemsEscapado = escapeTelegramMd(itemsText);

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://control-ventas-azure.vercel.app";
        const adminLink = `${appUrl}/dashboard/admin/pedidos`;

        await sendTelegramMessage(
          `🆕 *NUEVO PEDIDO RECIBIDO*\n\n` +
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

    return NextResponse.json(
      {
        message: "Pedido creado correctamente desde el carrito",
        pedido,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear pedido desde el carrito",
      logLabel: "POST pedidos/checkout error:",
    });
  }
}
