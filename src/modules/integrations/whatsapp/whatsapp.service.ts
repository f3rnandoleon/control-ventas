import crypto from "crypto";
import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import TransaccionPago from "@/models/transaccionPago";
import PerfilCliente from "@/models/perfilCliente";
import User from "@/models/user";
import { catalogRepository } from "@/modules/catalog/infrastructure/catalog.repository";
import { deliveryOptionsRepository } from "@/modules/delivery-options/infrastructure/delivery-options.repository";
import { runInTransaction } from "@/shared/db/runTransaction";
import { AppError } from "@/shared/errors/AppError";
import { generateOrderedId } from "@/utils/generarId";
import { uploadFileToCloudinary } from "@/libs/cloudinary";
import type { CreateWhatsAppOrderInput } from "@/schemas/whatsapp-integration.schema";

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

    const stockReservado = Math.max(0, variante.stockReservado || 0);
    const stockDisponible = Math.max(0, (variante.stock || 0) - stockReservado);

    if (stockDisponible < itemInput.cantidad) {
      throw new AppError(
        `Stock insuficiente para ${producto.nombre} (${variante.color} - ${variante.talla}). Disponible: ${stockDisponible}, Solicitado: ${itemInput.cantidad}`,
        400
      );
    }

    const precioUnitario = producto.precioVenta;
    const precioCosto = producto.precioCosto || 0;
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
    // Reserve stock on variant documents
    for (const itemProc of itemsProcesados) {
      itemProc.variante.stockReservado =
        (itemProc.variante.stockReservado || 0) + itemProc.cantidad;
      await itemProc.producto.save({ session });
    }

    const numeroPedido = generateOrderedId("P");
    const nuevoPedido = new Pedido({
      numeroPedido,
      canal: "WHATSAPP",
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

  pago.urlComprobante = comprobanteUrl;
  await pago.save();

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

  return {
    message: "Comprobante registrado exitosamente.",
    paymentId: pago._id.toString(),
    urlComprobante: comprobanteUrl,
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

