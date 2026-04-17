/**
 * telegram.ts
 * Servicio centralizado para enviar mensajes al admin vía Telegram Bot API.
 * Requiere en .env.local:
 *   TELEGRAM_BOT_TOKEN  — token del bot dado por BotFather
 *   TELEGRAM_CHAT_ID    — tu chat ID personal (o grupo de admins)
 */

const TELEGRAM_API = "https://api.telegram.org";

/**
 * Envía un mensaje de texto Markdown al admin de Telegram.
 * - Falla silenciosamente: si la notificación falla, no interrumpe el flujo principal.
 * - Usa parse_mode MarkdownV2 para texto enriquecido.
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados. Omitiendo notificación.");
    return;
  }

  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[Telegram] Error al enviar mensaje:", err);
    }
  } catch (err) {
    console.error("[Telegram] Excepción al enviar mensaje:", err);
  }
}

/**
 * Escapa caracteres especiales requeridos por MarkdownV2 de Telegram.
 * Úsalo para envolver valores dinámicos (nombres, montos, etc.).
 */
export function escapeTelegramMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}
