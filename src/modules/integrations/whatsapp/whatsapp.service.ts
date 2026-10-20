import crypto, { createHash, randomUUID } from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import Producto from "@/models/producto";
import TransaccionPago from "@/models/transaccionPago";
import PerfilCliente from "@/models/perfilCliente";
import User from "@/models/user";
import NivelStock from "@/models/nivelStock";
import { catalogRepository } from "@/modules/catalog/infrastructure/catalog.repository";
import { deliveryOptionsRepository } from "@/modules/delivery-options/infrastructure/delivery-options.repository";
import { runInTransaction } from "@/shared/db/runTransaction";
import { AppError } from "@/shared/errors/AppError";
import { generateOrderedId } from "@/utils/generarId";
import { uploadFileToCloudinary } from "@/libs/cloudinary";
import { sendTelegramMessage, escapeTelegramMd } from "@/libs/telegram";
import type {
  CreateWhatsAppOrderInput,
  WhatsAppProductSearchInput,
} from "@/schemas/whatsapp-integration.schema";
import { getVariantPricing } from "@/utils/pricing";
import {
  getAvailableWebStockForVariant,
  getWebDispatchBranchId,
  getWebStockMapForProducts,
} from "@/modules/inventory/application/branch-stock.service";

const BANK_SOL_QR_IMAGE =
  "https://res.cloudinary.com/dq1jeikev/image/upload/v1777964054/comprobante_xvdhuf.jpg";
const HUMAN_ATTENTION_NUMBER = "59167113105";

interface WhatsAppOrderItem {
  cantidad: number;
  totalLinea?: number;
  precioUnitario?: number;
  variante?: {
    color?: string;
    talla?: string;
  };
  productoSnapshot?: {
    nombre?: string;
    modelo?: string;
    imagen?: string;
  };
}

interface WhatsAppOrderPedidoDoc {
  _id: { toString(): string } | string;
  numeroPedido: string;
  subtotal: number;
  costoEnvio?: number;
  descuento?: number;
  total: number;
  estadoPedido: string;
  reservaExpiraEn?: Date | string | null;
  items?: WhatsAppOrderItem[];
  snapshotCliente?: {
    nombreCompleto?: string;
    telefono?: string;
  } | null;
  snapshotEntrega?: {
    metodo?: string;
  } | null;
}

interface WhatsAppOrderPagoDoc {
  _id?: { toString(): string } | string;
}

interface WhatsAppVariante {
  _id?: { toString(): string } | string;
  varianteId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  stock?: number;
  stockReservado?: number;
  codigoBarra?: string;
  qrCode?: string;
  imagenes?: string[];
  imagen?: string;
  precioVenta?: number;
  precioCosto?: number;
}

interface WhatsAppProductoDoc {
  _id: { toString(): string } | string;
  nombre: string;
  modelo?: string;
  sku?: string;
  estado?: string;
  precioVenta: number;
  precioCosto?: number;
  imagen?: string;
  variantes?: WhatsAppVariante[];
  save(options?: { session?: unknown }): Promise<unknown>;
}

interface PickupPointItem {
  id: string;
  name: string;
}

interface PickupScheduleItem {
  id: string;
  day: string;
  start: string;
  end: string;
}

interface ShippingCompanyItem {
  id: string;
  name: string;
}

interface DeliveryOptionsDoc {
  pickupPoints?: PickupPointItem[];
  pickupSchedules?: PickupScheduleItem[];
  shippingCompanies?: ShippingCompanyItem[];
}

export function verifyWhatsAppApiKey(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7).trim();
  const apiKey = process.env.WHATSAPP_INTEGRATION_API_KEY;

  if (!apiKey || !token) {
    return false;
  }

  const tokenBuffer = Buffer.from(token);
  const apiKeyBuffer = Buffer.from(apiKey);

  if (tokenBuffer.length !== apiKeyBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, apiKeyBuffer);
}

export function getEndOfDayInLaPaz(dateInput: string | Date): Date {
  const str = typeof dateInput === "string" ? dateInput : dateInput.toISOString();
  const dateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    throw new AppError("Formato de fecha inválido para scheduledFor", 400);
  }
  const [, yStr, mStr, dStr] = dateMatch;
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);

  // UTC-4 La Paz end of day (23:59:59.999) = YYYY-MM-(DD+1) T 03:59:59.999 UTC
  return new Date(Date.UTC(year, month, day + 1, 3, 59, 59, 999));
}

export function hashReviewToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildWhatsAppOrderResponse(
  pedido: WhatsAppOrderPedidoDoc,
  pago: WhatsAppOrderPagoDoc | null
) {
  const paymentInstructions = {
    method: "QR",
    bank: "BancoSol",
    accountHolder: "Fernando Leon Andrade Gutierrez",
    qrImageUrl: BANK_SOL_QR_IMAGE,
    amount: pedido.total,
    message: "Realiza el pago por QR y envía aquí la captura de tu comprobante.",
  };

  const itemsSummary = (pedido.items || [])
    .map(
      (i: WhatsAppOrderItem) =>
        `- ${i.cantidad}x ${i.productoSnapshot?.nombre || "Producto"} (${i.variante?.color} / ${i.variante?.talla}): Bs ${i.totalLinea?.toFixed(2)}`
    )
    .join("\n");

  const notificationText =
    `📦 *NUEVO PEDIDO DESDE WHATSAPP*\n\n` +
    `*Pedido:* #${pedido.numeroPedido}\n` +
    `*Cliente:* ${pedido.snapshotCliente?.nombreCompleto || "Cliente"} (${pedido.snapshotCliente?.telefono})\n` +
    `*Método:* ${pedido.snapshotEntrega?.metodo === "SHIPPING_NATIONAL" ? "Envío Nacional" : "Recojo en Punto"}\n` +
    `*Items:*\n${itemsSummary}\n\n` +
    `*Subtotal:* Bs ${(pedido.subtotal || 0).toFixed(2)}\n` +
    `*Envío:* Bs ${(pedido.costoEnvio || 0).toFixed(2)}\n` +
    `*Total a Pagar:* Bs ${(pedido.total || 0).toFixed(2)}\n` +
    `*Reserva válida hasta:* ${
      pedido.reservaExpiraEn
        ? new Date(pedido.reservaExpiraEn).toLocaleString("es-BO", {
            timeZone: "America/La_Paz",
          })
        : "N/A"
    }`;

  return {
    numeroPedido: pedido.numeroPedido,
    pedidoId: String(pedido._id),
    pagoId: pago?._id ? String(pago._id) : null,
    subtotal: pedido.subtotal,
    costoEnvio: pedido.costoEnvio || 0,
    descuento: pedido.descuento || 0,
    total: pedido.total,
    estado: pedido.estadoPedido,
    vencimientoReserva: pedido.reservaExpiraEn,
    paymentInstructions,
    notification: {
      to: HUMAN_ATTENTION_NUMBER,
      type: "NEW_ORDER",
      text: notificationText,
    },
  };
}

export async function createWhatsAppOrder(input: CreateWhatsAppOrderInput) {
  await connectDB();

  // 1. Idempotency Check
  const existingOrder = await Pedido.findOne({ idempotencyKey: input.idempotencyKey });
  if (existingOrder) {
    const existingPayment = await TransaccionPago.findOne({ pedidoId: existingOrder._id });
    return buildWhatsAppOrderResponse(
      existingOrder as unknown as WhatsAppOrderPedidoDoc,
      existingPayment as unknown as WhatsAppOrderPagoDoc | null
    );
  }

  // 2. Customer Lookup by phone
  const cleanPhone = input.customer.phone.trim();
  const perfilCliente = await PerfilCliente.findOne({ telefono: cleanPhone });
  let user = null;
  if (perfilCliente) {
    user = await User.findById(perfilCliente.usuarioId);
  }

  // 3. Items & Stock Validation
  const itemsProcesados: Array<{
    producto: WhatsAppProductoDoc;
    variante: WhatsAppVariante;
    cantidad: number;
    precioUnitario: number;
    totalLinea: number;
    precioCosto: number;
    ganancia: number;
  }> = [];

  let subtotal = 0;
  let gananciaTotal = 0;

  for (const itemInput of input.items) {
    const producto = (await catalogRepository.findById(
      itemInput.productoId
    )) as unknown as WhatsAppProductoDoc | null;
    if (!producto || producto.estado === "INACTIVO") {
      throw new AppError(`Producto no disponible (${itemInput.productoId})`, 400);
    }

    const variantes = producto.variantes || [];
    const variante = variantes.find(
      (v: WhatsAppVariante) =>
        (v.varianteId && v.varianteId === itemInput.varianteId) ||
        (v._id && String(v._id) === itemInput.varianteId)
    );

    if (!variante) {
      throw new AppError(
        `Variante no encontrada para el producto ${producto.nombre}`,
        400
      );
    }

    const varId = (variante.varianteId as string) || String(variante._id);
    const stockDisponible = await getAvailableWebStockForVariant(
      producto._id.toString(),
      varId
    );


    if (stockDisponible < itemInput.cantidad) {
      throw new AppError(
        `Stock insuficiente para ${producto.nombre} (${variante.color} - ${variante.talla}). Disponible: ${stockDisponible}, Solicitado: ${itemInput.cantidad}`,
        400
      );
    }

    const pricing = getVariantPricing(producto, variante);
    const precioUnitario = pricing.precioVenta;
    const precioCosto = pricing.precioCosto;
    const totalLinea = precioUnitario * itemInput.cantidad;
    const gananciaLinea = Math.max(0, (precioUnitario - precioCosto) * itemInput.cantidad);

    subtotal += totalLinea;
    gananciaTotal += gananciaLinea;

    itemsProcesados.push({
      producto,
      variante,
      cantidad: itemInput.cantidad,
      precioUnitario,
      totalLinea,
      precioCosto,
      ganancia: gananciaLinea,
    });
  }

  // 4. Delivery Calculation & Snapshot
  const costoEnvio = input.delivery.method === "SHIPPING_NATIONAL" ? 10 : 0;
  const total = subtotal + costoEnvio;

  const deliveryOptions = (await deliveryOptionsRepository.findDefault()) as unknown as DeliveryOptionsDoc | null;

  const snapshotEntrega: Record<string, unknown> = {
    metodo: input.delivery.method,
    telefono: input.delivery.phone.trim(),
    nombreDestinatario: input.delivery.recipientName.trim(),
    programadoPara: input.delivery.scheduledFor,
  };

  if (input.delivery.method === "PICKUP_POINT") {
    const pickupPoint = deliveryOptions?.pickupPoints?.find(
      (p: PickupPointItem) => p.id === input.delivery.pickupPointId
    );
    const pickupSchedule = deliveryOptions?.pickupSchedules?.find(
      (s: PickupScheduleItem) => s.id === input.delivery.pickupScheduleId
    );

    snapshotEntrega.puntoRecojo = pickupPoint
      ? pickupPoint.name
      : input.delivery.pickupPointId || "Punto de recojo principal";
    snapshotEntrega.horarioRecojo = pickupSchedule
      ? `${pickupSchedule.day} ${pickupSchedule.start}-${pickupSchedule.end}`
      : input.delivery.pickupScheduleId || null;
  } else {
    const company = deliveryOptions?.shippingCompanies?.find(
      (c: ShippingCompanyItem) => c.id === input.delivery.shippingCompanyId
    );

    snapshotEntrega.departamento = input.delivery.department;
    snapshotEntrega.ciudad = input.delivery.city;
    snapshotEntrega.empresaEnvio = company ? company.name : input.delivery.shippingCompanyId;
    snapshotEntrega.sucursal = input.delivery.branch;
    snapshotEntrega.ciRemitente = input.delivery.recipientCi;
  }

  const reservaExpiraEn = getEndOfDayInLaPaz(input.delivery.scheduledFor);

  // 5. Transactional Order & Payment Creation
  const { pedido, pago } = await runInTransaction(async (session) => {
    const webDispatchBranchId = await getWebDispatchBranchId(session);

    // Reserve stock on variant documents and branch NivelStock
    for (const itemProc of itemsProcesados) {
      const varId = itemProc.variante.varianteId || String(itemProc.variante._id);
      await NivelStock.findOneAndUpdate(
        { sucursalId: webDispatchBranchId, varianteId: varId },
        { $inc: { stockReservado: itemProc.cantidad } },
        { session }
      );

      itemProc.variante.stockReservado =
        (itemProc.variante.stockReservado || 0) + itemProc.cantidad;
      await itemProc.producto.save({ session });
    }

    const numeroPedido = generateOrderedId("P");
    const nuevoPedido = new Pedido({
      numeroPedido,
      canal: "WHATSAPP",
      sucursalId: webDispatchBranchId,
      estadoPedido: "PENDING_PAYMENT",
      estadoPago: "PENDING",
      estadoEntrega: "PENDING",
      estadoReservaStock: "RESERVED",
      reservadoEn: new Date(),
      reservaExpiraEn,
      metodoPago: "QR",
      cliente: user?._id || null,
      snapshotCliente: {
        usuarioId: user?._id || null,
        nombreCompleto:
          input.customer.name?.trim() ||
          user?.nombreCompleto ||
          "Cliente WhatsApp",
        email: user?.email || null,
        telefono: cleanPhone,
        tipoDocumento: null,
        numeroDocumento: null,
      },
      snapshotEntrega,
      items: itemsProcesados.map((itemProc) => ({
        productoId: itemProc.producto._id,
        variante: {
          varianteId:
            itemProc.variante.varianteId || (itemProc.variante._id ? String(itemProc.variante._id) : undefined),
          color: itemProc.variante.color,
          colorSecundario: itemProc.variante.colorSecundario,
          talla: itemProc.variante.talla,
          codigoBarra: itemProc.variante.codigoBarra,
          qrCode: itemProc.variante.qrCode,
        },
        productoSnapshot: {
          nombre: itemProc.producto.nombre,
          modelo: itemProc.producto.modelo,
          sku: itemProc.producto.sku,
          imagen:
            itemProc.variante.imagenes?.[0] ||
            itemProc.variante.imagen ||
            itemProc.producto.imagen,
        },
        cantidad: itemProc.cantidad,
        precioUnitario: itemProc.precioUnitario,
        totalLinea: itemProc.totalLinea,
        precioCosto: itemProc.precioCosto,
        ganancia: itemProc.ganancia,
      })),
      subtotal,
      costoEnvio,
      descuento: 0,
      total,
      gananciaTotal,
      idempotencyKey: input.idempotencyKey,
      notas: input.notes || null,
    });

    await nuevoPedido.save({ session });

    const numeroPago = generateOrderedId("PAGO");
    const nuevaTransaccion = new TransaccionPago({
      numeroPago,
      pedidoId: nuevoPedido._id,
      cliente: user?._id || null,
      metodoPago: "QR",
      monto: total,
      estado: "PENDING",
      idempotencyKey: input.idempotencyKey,
    });

    await nuevaTransaccion.save({ session });

    return { pedido: nuevoPedido, pago: nuevaTransaccion };
  });

  // Notificación Telegram de nuevo pedido reservado (similar al flujo web)
  try {
    const pedidoEscapado = escapeTelegramMd(pedido.numeroPedido);
    const montoEscapado = escapeTelegramMd(`Bs ${pedido.total.toFixed(2)}`);
    const clienteEscapado = escapeTelegramMd(
      pedido.snapshotCliente?.nombreCompleto || "Cliente WhatsApp"
    );
    const telefonoEscapado = escapeTelegramMd(
      pedido.snapshotCliente?.telefono || input.customer.phone
    );
    const metodoPagoEscapado = escapeTelegramMd(pedido.metodoPago);
    const metodoEntregaEscapado = escapeTelegramMd(
      pedido.snapshotEntrega?.metodo === "SHIPPING_NATIONAL"
        ? "Envío Nacional"
        : "Recojo en Punto"
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://control-ventas-azure.vercel.app";
    const adminLink = `${appUrl}/dashboard/admin/pedidos`;

    await sendTelegramMessage(
      `🆕 *NUEVO PEDIDO DESDE WHATSAPP*\n\n` +
      `📦 Pedido: \`${pedidoEscapado}\`\n` +
      `👤 Cliente: *${clienteEscapado}* \\(${telefonoEscapado}\\)\n` +
      `💰 Total: *${montoEscapado}*\n\n` +
      `💳 Pago: *${metodoPagoEscapado}*\n` +
      `🚚 Entrega: *${metodoEntregaEscapado}*\n\n` +
      `📋 [Ver detalle del pedido](${adminLink})`
    );
  } catch (tgError) {
    console.error("[Telegram] Error al enviar notificación de pedido WhatsApp:", tgError);
  }

  return buildWhatsAppOrderResponse(
    pedido as unknown as WhatsAppOrderPedidoDoc,
    pago as unknown as WhatsAppOrderPagoDoc | null
  );
}

export async function uploadWhatsAppPaymentProof(paymentId: string, file: File) {
  await connectDB();
  const pago = await TransaccionPago.findById(paymentId);
  if (!pago) {
    throw new AppError("Transacción de pago no encontrada", 404);
  }

  const pedido = await Pedido.findById(pago.pedidoId);
  if (!pedido) {
    throw new AppError("Pedido no encontrado para este pago", 404);
  }

  const comprobanteUrl = await uploadFileToCloudinary(
    file,
    "control-ventas/comprobantes"
  );

  const tokenRevision = randomUUID();
  pago.urlComprobante = comprobanteUrl;
  pago.tokenRevision = undefined;
  pago.tokenRevisionHash = hashReviewToken(tokenRevision);
  pago.tokenRevisionPurpose = "PAYMENT_PROOF_REVIEW";
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);
  pago.tokenRevisionExpiresAt = expiresAt;
  pago.tokenRevisionUsedAt = null;
  pago.tokenRevisionUsedBy = null;
  pago.tokenRevisionUsado = false;
  await pago.save();

  if (pedido.estadoReservaStock === "RESERVED") {
    const extendedDate = new Date();
    extendedDate.setHours(extendedDate.getHours() + 48);
    pedido.reservaExpiraEn = extendedDate;
    await pedido.save();
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://control-ventas-azure.vercel.app";
  const verifyLink = `${appUrl}/verificar/pago/${tokenRevision}`;

  const clienteTel =
    pedido.snapshotCliente?.telefono ||
    pedido.snapshotEntrega?.telefono ||
    "Desconocido";
  const clienteNombre =
    pedido.snapshotCliente?.nombreCompleto || "Cliente WhatsApp";

  const notificationText =
    `🧾 *NUEVO COMPROBANTE RECIBIDO DESDE WHATSAPP*\n\n` +
    `*Pedido:* #${pedido.numeroPedido}\n` +
    `*Pago:* ${pago.numeroPago}\n` +
    `*Cliente:* ${clienteNombre} (${clienteTel})\n` +
    `*Monto:* Bs ${pago.monto.toFixed(2)}\n` +
    `*Comprobante:* ${comprobanteUrl}`;

  try {
    const montoEscapado = escapeTelegramMd(`Bs ${pago.monto?.toFixed(2) ?? "0.00"}`);
    const pagoEscapado = escapeTelegramMd(pago.numeroPago ?? paymentId);
    const pedidoEscapado = escapeTelegramMd(pedido.numeroPedido);
    const clienteEscapado = escapeTelegramMd(clienteNombre);
    const linkEscapado = escapeTelegramMd(verifyLink);

    await sendTelegramMessage(
      `🔔 *NUEVO COMPROBANTE WHATSAPP POR VERIFICAR*\n\n` +
      `📦 Pedido: \`${pedidoEscapado}\`\n` +
      `💳 Pago: \`${pagoEscapado}\`\n` +
      `👤 Cliente: *${clienteEscapado}*\n` +
      `💰 Monto: *${montoEscapado}*\n\n` +
      `📋 [Ver comprobante y procesar](${linkEscapado})\n\n` +
      `_Este link es de un solo uso\\._`
    );
  } catch (tgError) {
    console.error("[Telegram] Error al enviar notificación de comprobante WhatsApp:", tgError);
  }

  return {
    message: "Comprobante registrado exitosamente. El administrador fue notificado para su verificación.",
    paymentId: pago._id.toString(),
    urlComprobante: comprobanteUrl,
    tokenRevision,
    verifyUrl: verifyLink,
    notification: {
      to: HUMAN_ATTENTION_NUMBER,
      type: "PAYMENT_PROOF_UPLOADED",
      text: notificationText,
    },
  };
}

export async function getWhatsAppOrderStatus(numeroPedido: string, phone: string) {
  await connectDB();
  const pedido = await Pedido.findOne({ numeroPedido });
  if (!pedido) {
    throw new AppError("Pedido no encontrado", 404);
  }

  const cleanQueryPhone = phone.trim();
  const clientPhone = pedido.snapshotCliente?.telefono?.trim();
  const deliveryPhone = pedido.snapshotEntrega?.telefono?.trim();

  if (cleanQueryPhone !== clientPhone && cleanQueryPhone !== deliveryPhone) {
    throw new AppError("Pedido no encontrado o teléfono no coincide", 403);
  }

  const itemsSanitizados = (pedido.items || []).map((item: WhatsAppOrderItem) => ({
    nombre: item.productoSnapshot?.nombre,
    modelo: item.productoSnapshot?.modelo,
    color: item.variante?.color,
    talla: item.variante?.talla,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    totalLinea: item.totalLinea,
    imagen: item.productoSnapshot?.imagen,
  }));

  return {
    numeroPedido: pedido.numeroPedido,
    createdAt: pedido.createdAt,
    estadoPedido: pedido.estadoPedido,
    estadoPago: pedido.estadoPago,
    estadoEntrega: pedido.estadoEntrega,
    estadoReservaStock: pedido.estadoReservaStock,
    vencimientoReserva: pedido.reservaExpiraEn,
    subtotal: pedido.subtotal,
    costoEnvio: pedido.costoEnvio || 0,
    descuento: pedido.descuento || 0,
    total: pedido.total,
    items: itemsSanitizados,
    entrega: {
      metodo: pedido.snapshotEntrega?.metodo,
      nombreDestinatario: pedido.snapshotEntrega?.nombreDestinatario,
      telefono: pedido.snapshotEntrega?.telefono,
      puntoRecojo: pedido.snapshotEntrega?.puntoRecojo,
      departamento: pedido.snapshotEntrega?.departamento,
      ciudad: pedido.snapshotEntrega?.ciudad,
      empresaEnvio: pedido.snapshotEntrega?.empresaEnvio,
      sucursal: pedido.snapshotEntrega?.sucursal,
      programadoPara: pedido.snapshotEntrega?.programadoPara,
    },
  };
}

/**
 * Búsqueda de productos de alto rendimiento y bajo consumo de tokens para el Agente IA de WhatsApp.
 * Devuelve únicamente prendas activas con variantes que tienen stock web real disponible (> 0).
 */
export async function searchWhatsAppProducts(filters: WhatsAppProductSearchInput) {
  await connectDB();

  const query: Record<string, unknown> = { estado: "ACTIVO" };

  if (filters.q?.trim()) {
    const safeQ = filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safeQ, "i");
    query.$or = [
      { nombre: regex },
      { modelo: regex },
      { descripcion: regex },
      { "variantes.color": regex },
      { "variantes.talla": regex },
    ];
  }

  if (filters.color?.trim()) {
    const safeColor = filters.color.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const colorRegex = new RegExp(safeColor, "i");
    const existingOr = (query.$or as Record<string, unknown>[]) || [];
    query.$or = [
      ...existingOr,
      { "variantes.color": colorRegex },
      { "variantes.colorSecundario": colorRegex },
    ];
  }

  if (filters.talla?.trim()) {
    const safeTalla = filters.talla.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query["variantes.talla"] = new RegExp(`^${safeTalla}$`, "i");
  }

  if (filters.minPrecio !== undefined || filters.maxPrecio !== undefined) {
    const precioFilter: Record<string, number> = {};
    if (filters.minPrecio !== undefined) precioFilter.$gte = filters.minPrecio;
    if (filters.maxPrecio !== undefined) precioFilter.$lte = filters.maxPrecio;
    query.precioVenta = precioFilter;
  }

  const limit = Math.min(filters.limit || 5, 20);

  // Consultar con margen superior para cubrir variantes con stock agotado
  const rawProducts = await Producto.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 3)
    .lean();

  if (rawProducts.length === 0) {
    return { total: 0, productos: [] };
  }

  const productIds = rawProducts.map(
    (p: Record<string, unknown>) => p._id as mongoose.Types.ObjectId
  );
  const webStockMap = await getWebStockMapForProducts(productIds);

  const colorNorm = filters.color?.trim().toLowerCase();
  const tallaNorm = filters.talla?.trim().toLowerCase();

  const resultados: Array<{
    productoId: string;
    nombre: string;
    modelo: string;
    categoria: string;
    precioVenta: number;
    descripcionCorta?: string;
    variantesDisponibles: Array<{
      varianteId: string;
      color: string;
      colorSecundario?: string;
      talla: string;
      stockDisponible: number;
      precioVenta: number;
      imagen?: string;
      medidasResumen?: {
        anchoPecho?: number;
        largoTotal?: number;
      };
    }>;
  }> = [];

  for (const prod of rawProducts) {
    const prodKey = String(prod._id);
    const prodStockMap = webStockMap.get(prodKey);
    const variantes = (prod.variantes || []) as Array<{
      varianteId?: string;
      color: string;
      colorSecundario?: string;
      talla: string;
      stock?: number;
      stockReservado?: number;
      precioVenta?: number;
      imagenes?: string[];
      imagen?: string;
      medidas?: {
        anchoPecho?: number;
        largoTotal?: number;
      };
    }>;

    const variantesValidas = [];

    for (const v of variantes) {
      const varId = v.varianteId || "";
      const stockInfo = prodStockMap?.get(varId);
      const stockDisponible =
        stockInfo !== undefined
          ? stockInfo.stockDisponible
          : Math.max(0, Number(v.stock || 0) - Number(v.stockReservado || 0));

      if (stockDisponible <= 0) continue;

      if (colorNorm) {
        const c1 = (v.color || "").toLowerCase();
        const c2 = (v.colorSecundario || "").toLowerCase();
        if (!c1.includes(colorNorm) && !c2.includes(colorNorm)) {
          continue;
        }
      }

      if (tallaNorm) {
        const t = (v.talla || "").toLowerCase();
        if (t !== tallaNorm) {
          continue;
        }
      }

      const img =
        (Array.isArray(v.imagenes) && v.imagenes.length > 0 ? v.imagenes[0] : undefined) ||
        v.imagen ||
        undefined;

      variantesValidas.push({
        varianteId: varId,
        color: v.color,
        colorSecundario: v.colorSecundario || undefined,
        talla: v.talla,
        stockDisponible,
        precioVenta:
          typeof v.precioVenta === "number" && v.precioVenta > 0
            ? v.precioVenta
            : Number(prod.precioVenta || 0),
        imagen: img,
        medidasResumen: v.medidas
          ? {
              anchoPecho: v.medidas.anchoPecho,
              largoTotal: v.medidas.largoTotal,
            }
          : undefined,
      });
    }

    if (variantesValidas.length > 0) {
      resultados.push({
        productoId: prodKey,
        nombre: String(prod.nombre || ""),
        modelo: String(prod.modelo || ""),
        categoria: String(prod.categoria || "Chompas"),
        precioVenta: Number(prod.precioVenta || 0),
        descripcionCorta: prod.descripcion ? String(prod.descripcion).substring(0, 140) : undefined,
        variantesDisponibles: variantesValidas,
      });

      if (resultados.length >= limit) {
        break;
      }
    }
  }

  return {
    total: resultados.length,
    productos: resultados,
  };
}

/**
 * Consulta de medidas anatómicas y tallas para asesorar al cliente en WhatsApp.
 */
export async function getWhatsAppProductMeasurements(productoId: string) {
  if (!mongoose.Types.ObjectId.isValid(productoId)) {
    throw new AppError("ID de producto inválido", 400);
  }

  await connectDB();
  const rawProd = await Producto.findById(productoId).lean();

  if (!rawProd || Array.isArray(rawProd)) {
    throw new AppError("Producto no encontrado", 404);
  }

  const prod = rawProd as Record<string, unknown> & {
    _id: unknown;
    nombre?: string;
    modelo?: string;
    categoria?: string;
    variantes?: Array<{
      talla?: string;
      color?: string;
      medidas?: Record<string, unknown>;
    }>;
  };

  const tallasMap = new Map<
    string,
    {
      colores: Set<string>;
      medidas?: Record<string, unknown>;
    }
  >();

  const variantes = (prod.variantes || []) as Array<{
    talla?: string;
    color?: string;
    medidas?: Record<string, unknown>;
  }>;

  for (const v of variantes) {
    const t = v.talla || "Única";
    if (!tallasMap.has(t)) {
      tallasMap.set(t, {
        colores: new Set<string>(),
        medidas: v.medidas || undefined,
      });
    }
    const entry = tallasMap.get(t)!;
    if (v.color) entry.colores.add(v.color);
    if (!entry.medidas && v.medidas) {
      entry.medidas = v.medidas;
    }
  }

  const tallas = Array.from(tallasMap.entries()).map(([talla, data]) => ({
    talla,
    coloresDisponibles: Array.from(data.colores),
    medidas: data.medidas || null,
  }));

  return {
    productoId: String(prod._id),
    nombre: String(prod.nombre),
    modelo: String(prod.modelo),
    categoria: String(prod.categoria),
    tallas,
  };
}

