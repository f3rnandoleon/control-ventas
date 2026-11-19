import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Promocion from "@/models/promocion";
import Cupon from "@/models/cupon";
import UsoPromocion from "@/models/usoPromocion";
import Producto from "@/models/producto";
import Pedido from "@/models/pedido";
import { AppError } from "@/shared/errors/AppError";
import { getWebVariantPricing } from "@/utils/pricing";
import { findVariantByIdentity } from "@/utils/varianteIdentity";
import type { Variante } from "@/types/producto";
import type {
  EvaluacionPromocionesResult,
  PromocionAplicadaSnapshot,
} from "@/types/promocion";
import type {
  CreateCuponInput,
  CreatePromocionInput,
  EvaluatePromotionsInput,
  UpdateCuponInput,
  UpdatePromocionInput,
} from "@/schemas/promocion.schema";
import {
  evaluatePromotionsEngine,
  type EngineCuponContext,
  type EngineLineInput,
  type EnginePromocionRule,
} from "@/modules/promotions/domain/promotion-engine";

function assertObjectId(id: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(message, 400);
  }
}

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-()]/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPromocionDocToRule(doc: any): EnginePromocionRule {
  return {
    _id: doc._id.toString(),
    nombre: doc.nombre,
    estado: doc.estado,
    canales: doc.canales || ["WEB"],
    metodoActivacion: doc.metodoActivacion || "AUTOMATICA",
    tipo: doc.tipo,
    valor: Number(doc.valor || 0),
    reglaNxM: doc.reglaNxM
      ? { lleva: Number(doc.reglaNxM.lleva), paga: Number(doc.reglaNxM.paga) }
      : null,
    descuentoMaximo:
      doc.descuentoMaximo !== undefined && doc.descuentoMaximo !== null
        ? Number(doc.descuentoMaximo)
        : null,
    alcance: doc.alcance || "PEDIDO",
    productosIncluidos: (doc.productosIncluidos || []).map((id: unknown) => String(id)),
    categoriasIncluidas: doc.categoriasIncluidas || [],
    productosExcluidos: (doc.productosExcluidos || []).map((id: unknown) => String(id)),
    condiciones: {
      montoMinimoCompra: Number(doc.condiciones?.montoMinimoCompra || 0),
      cantidadMinimaPrendas: Number(doc.condiciones?.cantidadMinimaPrendas || 0),
      soloPrimeraCompra: Boolean(doc.condiciones?.soloPrimeraCompra),
    },
    prioridad: Number(doc.prioridad ?? 10),
    acumulable: Boolean(doc.acumulable),
    acumulableConRebajasCatalogo: Boolean(doc.acumulableConRebajasCatalogo),
    fechaInicio: doc.fechaInicio || null,
    fechaFin: doc.fechaFin || null,
    usoMaximoTotal:
      doc.usoMaximoTotal !== undefined && doc.usoMaximoTotal !== null
        ? Number(doc.usoMaximoTotal)
        : null,
    usoMaximoPorCliente:
      doc.usoMaximoPorCliente !== undefined && doc.usoMaximoPorCliente !== null
        ? Number(doc.usoMaximoPorCliente)
        : null,
    usosActuales: Number(doc.usosActuales || 0),
  };
}

async function countCustomerUsages(
  filter: { promocionId?: string; cuponId?: string },
  customer: { clienteId?: string | null; telefonoInvitado?: string | null },
  session?: ClientSession
): Promise<number> {
  const identityOr: Record<string, unknown>[] = [];
  if (customer.clienteId && mongoose.Types.ObjectId.isValid(customer.clienteId)) {
    identityOr.push({ clienteId: new mongoose.Types.ObjectId(customer.clienteId) });
  }
  const phone = normalizePhone(customer.telefonoInvitado);
  if (phone) {
    identityOr.push({ telefonoInvitado: phone });
  }
  if (identityOr.length === 0) return 0;

  const query: Record<string, unknown> = {
    estado: { $in: ["RESERVADO", "APLICADO"] },
    $or: identityOr,
  };
  if (filter.promocionId) {
    query.promocionId = new mongoose.Types.ObjectId(filter.promocionId);
  }
  if (filter.cuponId) {
    query.cuponId = new mongoose.Types.ObjectId(filter.cuponId);
  }

  return UsoPromocion.countDocuments(query).session(session ?? null);
}

async function isCustomerFirstPurchase(
  customer: { clienteId?: string | null; telefonoInvitado?: string | null },
  session?: ClientSession
): Promise<boolean> {
  const identityOr: Record<string, unknown>[] = [];
  if (customer.clienteId && mongoose.Types.ObjectId.isValid(customer.clienteId)) {
    identityOr.push({ cliente: new mongoose.Types.ObjectId(customer.clienteId) });
  }
  const phone = normalizePhone(customer.telefonoInvitado);
  if (phone) {
    identityOr.push({ "snapshotCliente.telefono": phone });
    identityOr.push({ "datosClienteInvitado.telefono": phone });
  }
  if (identityOr.length === 0) {
    return true;
  }

  const existingOrder = await Pedido.exists({
    estadoPedido: { $ne: "CANCELLED" },
    $or: identityOr,
  }).session(session ?? null);

  return !existingOrder;
}

export async function evaluateWebResolvedItems(params: {
  items: EngineLineInput[];
  costoEnvio?: number;
  cuponCodigo?: string | null;
  clienteId?: string | null;
  telefonoInvitado?: string | null;
  session?: ClientSession;
  now?: Date;
}): Promise<EvaluacionPromocionesResult> {
  await connectDB();
  const now = params.now || new Date();
  const session = params.session;

  const autoDocs = await Promocion.find({
    estado: "ACTIVA",
    canales: "WEB",
    metodoActivacion: "AUTOMATICA",
    $and: [
      { $or: [{ fechaInicio: null }, { fechaInicio: { $lte: now } }] },
      { $or: [{ fechaFin: null }, { fechaFin: { $gte: now } }] },
    ],
  })
    .sort({ prioridad: 1, createdAt: 1 })
    .session(session ?? null)
    .lean();

  const promocionesAutomaticas = autoDocs.map(mapPromocionDocToRule);

  const cuponCode = params.cuponCodigo ? params.cuponCodigo.trim().toUpperCase() : null;
  let cuponContext: EngineCuponContext | null = null;

  if (cuponCode) {
    const cuponDoc = await Cupon.findOne({ codigo: cuponCode })
      .populate("promocionId")
      .session(session ?? null)
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCupon = cuponDoc as any;
    if (rawCupon && rawCupon.promocionId && typeof rawCupon.promocionId === "object") {
      const promoRule = mapPromocionDocToRule(rawCupon.promocionId);
      const usosClienteCupon = await countCustomerUsages(
        { cuponId: rawCupon._id.toString() },
        { clienteId: params.clienteId, telefonoInvitado: params.telefonoInvitado },
        session
      );

      cuponContext = {
        _id: rawCupon._id.toString(),
        codigo: rawCupon.codigo,
        activo: Boolean(rawCupon.activo),
        usoMaximoTotal:
          rawCupon.usoMaximoTotal !== undefined && rawCupon.usoMaximoTotal !== null
            ? Number(rawCupon.usoMaximoTotal)
            : null,
        usoMaximoPorCliente:
          rawCupon.usoMaximoPorCliente !== undefined && rawCupon.usoMaximoPorCliente !== null
            ? Number(rawCupon.usoMaximoPorCliente)
            : null,
        usosActuales: Number(rawCupon.usosActuales || 0),
        usosClienteActuales: usosClienteCupon,
        promocion: promoRule,
      };
    }
  }

  const allPromoRules = [
    ...promocionesAutomaticas,
    ...(cuponContext ? [cuponContext.promocion] : []),
  ];

  const usosClientePorPromocion: Record<string, number> = {};
  for (const rule of allPromoRules) {
    if (rule.usoMaximoPorCliente !== null && rule.usoMaximoPorCliente !== undefined) {
      usosClientePorPromocion[rule._id] = await countCustomerUsages(
        { promocionId: rule._id },
        { clienteId: params.clienteId, telefonoInvitado: params.telefonoInvitado },
        session
      );
    }
  }

  const needsFirstPurchaseCheck = allPromoRules.some(
    (rule) => rule.condiciones?.soloPrimeraCompra
  );
  const esPrimeraCompra = needsFirstPurchaseCheck
    ? await isCustomerFirstPurchase(
        { clienteId: params.clienteId, telefonoInvitado: params.telefonoInvitado },
        session
      )
    : false;

  return evaluatePromotionsEngine({
    items: params.items,
    costoEnvio: params.costoEnvio || 0,
    canal: "WEB",
    promocionesAutomaticas,
    usosClientePorPromocion,
    cuponCodigoSolicitado: cuponCode,
    cuponContext,
    esPrimeraCompra,
    now,
  });
}

/**
 * Preview público/cliente de carrito sin necesidad de tener carrito persistido (ideal para invitados).
 * Oculta `precioCosto` y `gananciaNeta` de la respuesta.
 */
export async function evaluateWebRawItemsPreview(
  input: EvaluatePromotionsInput,
  clienteId?: string | null
) {
  await connectDB();
  const now = new Date();
  const resolvedItems: EngineLineInput[] = [];

  type LeanEvalProducto = {
    _id: mongoose.Types.ObjectId;
    nombre: string;
    estado?: string;
    categoria?: string;
    precioVenta: number;
    precioCosto?: number | null;
    rebajaWeb?: {
      activa: boolean;
      tipo: "PORCENTAJE" | "PRECIO_FIJO";
      valor: number;
      fechaInicio?: string | Date | null;
      fechaFin?: string | Date | null;
    } | null;
    descuento?: number | null;
    variantes?: Variante[];
  };

  for (const item of input.items) {
    const producto = (await Producto.findById(item.productoId).lean()) as unknown as LeanEvalProducto | null;
    if (!producto || producto.estado === "INACTIVO") {
      throw new AppError(`Producto no encontrado (${item.productoId})`, 404);
    }

    const variante = findVariantByIdentity((producto.variantes || []) as Variante[], {
      varianteId: item.varianteId || item.variantId || undefined,
      color: item.color,
      colorSecundario: item.colorSecundario,
      talla: item.talla,
    });

    if (!variante) {
      throw new AppError(
        `Variante no encontrada para ${producto.nombre} (${item.color}/${item.talla})`,
        404
      );
    }

    const webPricing = getWebVariantPricing(producto, variante, now);
    resolvedItems.push({
      productoId: String(producto._id),
      varianteId: variante.varianteId,
      color: variante.color,
      colorSecundario: variante.colorSecundario,
      talla: variante.talla,
      categoria: producto.categoria,
      cantidad: item.cantidad,
      precioUnitarioLista: webPricing.precioLista,
      precioWebEfectivo: webPricing.precioVenta,
      precioCosto: webPricing.precioCosto,
      tieneRebajaCatalogo: webPricing.tieneRebaja,
    });
  }

  const evaluation = await evaluateWebResolvedItems({
    items: resolvedItems,
    costoEnvio: input.costoEnvio || 0,
    cuponCodigo: input.cuponCodigo || null,
    clienteId: clienteId || null,
    telefonoInvitado: input.telefonoInvitado || null,
    now,
  });

  // Sanitizar respuesta pública (sin costos ni márgenes internos)
  return {
    subtotalLista: evaluation.subtotalLista,
    subtotalPostCatalogo: evaluation.subtotalPostCatalogo,
    descuentoCatalogo: evaluation.descuentoCatalogo,
    descuentoPromociones: evaluation.descuentoPromociones,
    descuentoEnvio: evaluation.descuentoEnvio,
    descuentoTotal: evaluation.descuentoTotal,
    costoEnvioOriginal: evaluation.costoEnvioOriginal,
    costoEnvioFinal: evaluation.costoEnvioFinal,
    totalFinal: evaluation.totalFinal,
    promocionesAplicadas: evaluation.promocionesAplicadas,
    cuponCodigo: evaluation.cuponCodigo,
    cuponValido: evaluation.cuponValido,
    cuponErrorCodigo: evaluation.cuponErrorCodigo,
    cuponErrorMensaje: evaluation.cuponErrorMensaje,
    items: evaluation.items.map((it) => ({
      productoId: it.productoId,
      varianteId: it.varianteId,
      color: it.color,
      colorSecundario: it.colorSecundario,
      talla: it.talla,
      cantidad: it.cantidad,
      precioUnitarioLista: it.precioUnitarioLista,
      precioWebEfectivo: it.precioWebEfectivo,
      tieneRebajaCatalogo: it.tieneRebajaCatalogo,
      descuentoCatalogo: it.descuentoCatalogo,
      descuentoLinea: it.descuentoLinea,
      descuentoProrrateado: it.descuentoProrrateado,
      totalLineaBruto: it.totalLineaBruto,
      totalLineaNeto: it.totalLineaNeto,
    })),
  };
}

/**
 * Reserva atómicamente los usos de promociones/cupones dentro de la transacción de checkout.
 * Lanza AppError(409) si alguna promoción o cupón alcanzó su límite en concurrencia.
 */
export async function reservePromotionsForOrder(
  promocionesAplicadas: PromocionAplicadaSnapshot[],
  pedidoId: mongoose.Types.ObjectId | string,
  customer: { clienteId?: string | null; telefonoInvitado?: string | null },
  session: ClientSession
) {
  if (!promocionesAplicadas || promocionesAplicadas.length === 0) return;

  const pedidoObjectId =
    typeof pedidoId === "string" ? new mongoose.Types.ObjectId(pedidoId) : pedidoId;
  const clienteObjectId =
    customer.clienteId && mongoose.Types.ObjectId.isValid(customer.clienteId)
      ? new mongoose.Types.ObjectId(customer.clienteId)
      : null;
  const telefono = normalizePhone(customer.telefonoInvitado);

  for (const applied of promocionesAplicadas) {
    const promoObjectId = new mongoose.Types.ObjectId(applied.promocionId);
    const promoDoc = await Promocion.findById(promoObjectId).session(session);
    if (!promoDoc || promoDoc.estado !== "ACTIVA") {
      throw new AppError(
        `La promoción "${applied.nombre}" ya no se encuentra disponible`,
        409
      );
    }

    if (promoDoc.usoMaximoPorCliente) {
      const usosCliente = await countCustomerUsages(
        { promocionId: applied.promocionId },
        { clienteId: customer.clienteId, telefonoInvitado: telefono },
        session
      );
      if (usosCliente >= promoDoc.usoMaximoPorCliente) {
        throw new AppError(
          `Ya alcanzaste el límite de usos permitido para "${applied.nombre}"`,
          409
        );
      }
    }

    const promoFilter: Record<string, unknown> = {
      _id: promoObjectId,
      estado: "ACTIVA",
    };
    if (promoDoc.usoMaximoTotal) {
      promoFilter.usosActuales = { $lt: promoDoc.usoMaximoTotal };
    }

    const updatedPromo = await Promocion.findOneAndUpdate(
      promoFilter,
      { $inc: { usosActuales: 1 } },
      { new: true, session }
    );

    if (!updatedPromo) {
      throw new AppError(
        `La promoción "${applied.nombre}" alcanzó su límite máximo de usos`,
        409
      );
    }

    let cuponObjectId: mongoose.Types.ObjectId | null = null;
    if (applied.cuponId) {
      cuponObjectId = new mongoose.Types.ObjectId(applied.cuponId);
      const cuponDoc = await Cupon.findById(cuponObjectId).session(session);
      if (!cuponDoc || !cuponDoc.activo) {
        throw new AppError(
          `El cupón "${applied.codigoCupon}" ya no se encuentra activo`,
          409
        );
      }

      if (cuponDoc.usoMaximoPorCliente) {
        const usosClienteCupon = await countCustomerUsages(
          { cuponId: applied.cuponId },
          { clienteId: customer.clienteId, telefonoInvitado: telefono },
          session
        );
        if (usosClienteCupon >= cuponDoc.usoMaximoPorCliente) {
          throw new AppError(
            `Ya alcanzaste el límite de usos para el cupón "${applied.codigoCupon}"`,
            409
          );
        }
      }

      const cuponFilter: Record<string, unknown> = {
        _id: cuponObjectId,
        activo: true,
      };
      if (cuponDoc.usoMaximoTotal) {
        cuponFilter.usosActuales = { $lt: cuponDoc.usoMaximoTotal };
      }

      const updatedCupon = await Cupon.findOneAndUpdate(
        cuponFilter,
        { $inc: { usosActuales: 1 } },
        { new: true, session }
      );

      if (!updatedCupon) {
        throw new AppError(
          `El cupón "${applied.codigoCupon}" alcanzó su límite máximo de usos`,
          409
        );
      }
    }

    await UsoPromocion.create(
      [
        {
          promocionId: promoObjectId,
          cuponId: cuponObjectId,
          codigoCupon: applied.codigoCupon || null,
          pedidoId: pedidoObjectId,
          clienteId: clienteObjectId,
          telefonoInvitado: telefono,
          montoDescontado: applied.montoDescontado,
          estado: "RESERVADO",
        },
      ],
      { session }
    );
  }
}

/**
 * Revierte usos de promociones/cupones de un pedido cancelado o con reserva expirada.
 * Idempotente: si ya estaban revertidos, no vuelve a decrementar contadores.
 */
export async function revertPromotionsForOrder(
  pedidoId: mongoose.Types.ObjectId | string,
  session: ClientSession
) {
  const pedidoObjectId =
    typeof pedidoId === "string" ? new mongoose.Types.ObjectId(pedidoId) : pedidoId;

  const activeUsages = await UsoPromocion.find({
    pedidoId: pedidoObjectId,
    estado: { $in: ["RESERVADO", "APLICADO"] },
  }).session(session);

  for (const uso of activeUsages) {
    uso.estado = "REVERTIDO";
    await uso.save({ session });

    await Promocion.updateOne(
      { _id: uso.promocionId, usosActuales: { $gt: 0 } },
      { $inc: { usosActuales: -1 } },
      { session }
    );

    if (uso.cuponId) {
      await Cupon.updateOne(
        { _id: uso.cuponId, usosActuales: { $gt: 0 } },
        { $inc: { usosActuales: -1 } },
        { session }
      );
    }
  }
}

/**
 * Promociones automáticas vigentes para el Storefront Web (solo campos públicos).
 */
export async function listPublicActiveWebPromotions() {
  await connectDB();
  const now = new Date();

  const docs = await Promocion.find({
    estado: "ACTIVA",
    canales: "WEB",
    metodoActivacion: "AUTOMATICA",
    $and: [
      { $or: [{ fechaInicio: null }, { fechaInicio: { $lte: now } }] },
      { $or: [{ fechaFin: null }, { fechaFin: { $gte: now } }] },
    ],
  })
    .select(
      "nombre descripcion tipo valor reglaNxM descuentoMaximo alcance productosIncluidos categoriasIncluidas condiciones prioridad acumulable acumulableConRebajasCatalogo fechaInicio fechaFin"
    )
    .sort({ prioridad: 1, createdAt: -1 })
    .lean();

  return docs;
}

// ==========================================
// CRUD ADMIN DE PROMOCIONES Y CUPONES
// ==========================================

export async function listAdminPromociones(filters?: {
  estado?: string;
  metodoActivacion?: string;
}) {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters?.estado && filters.estado !== "ALL") {
    query.estado = filters.estado;
  }
  if (filters?.metodoActivacion && filters.metodoActivacion !== "ALL") {
    query.metodoActivacion = filters.metodoActivacion;
  }

  return Promocion.find(query)
    .sort({ prioridad: 1, createdAt: -1 })
    .lean();
}

export async function getAdminPromocionById(id: string) {
  assertObjectId(id, "ID de promoción inválido");
  await connectDB();
  const promo = await Promocion.findById(id).lean();
  if (!promo) throw new AppError("Promoción no encontrada", 404);
  return promo;
}

export async function createAdminPromocion(
  input: CreatePromocionInput,
  userId?: string | null
) {
  await connectDB();
  const created = await Promocion.create({
    ...input,
    fechaInicio: input.fechaInicio ? new Date(input.fechaInicio) : null,
    fechaFin: input.fechaFin ? new Date(input.fechaFin) : null,
    creadoPor: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
  });
  return created.toObject();
}

export async function updateAdminPromocion(id: string, input: UpdatePromocionInput) {
  assertObjectId(id, "ID de promoción inválido");
  await connectDB();

  const updatePayload: Record<string, unknown> = { ...input };
  if (input.fechaInicio !== undefined) {
    updatePayload.fechaInicio = input.fechaInicio ? new Date(input.fechaInicio) : null;
  }
  if (input.fechaFin !== undefined) {
    updatePayload.fechaFin = input.fechaFin ? new Date(input.fechaFin) : null;
  }

  const updated = await Promocion.findByIdAndUpdate(id, updatePayload, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) throw new AppError("Promoción no encontrada", 404);
  return updated;
}

export async function toggleAdminPromocion(id: string) {
  assertObjectId(id, "ID de promoción inválido");
  await connectDB();

  const promo = await Promocion.findById(id);
  if (!promo) throw new AppError("Promoción no encontrada", 404);

  promo.estado = promo.estado === "ACTIVA" ? "PAUSADA" : "ACTIVA";
  await promo.save();
  return promo.toObject();
}

export async function deleteAdminPromocion(id: string) {
  assertObjectId(id, "ID de promoción inválido");
  await connectDB();

  const hasUsages = await UsoPromocion.exists({ promocionId: id });
  if (hasUsages) {
    throw new AppError(
      "No se puede eliminar una promoción que ya registra usos históricos. Paused o finalícela en su lugar.",
      409
    );
  }

  await Cupon.deleteMany({ promocionId: id });
  const deleted = await Promocion.findByIdAndDelete(id);
  if (!deleted) throw new AppError("Promoción no encontrada", 404);
  return { deleted: true };
}

export async function listPromocionUsos(promocionId: string) {
  assertObjectId(promocionId, "ID de promoción inválido");
  await connectDB();

  return UsoPromocion.find({ promocionId })
    .populate("pedidoId", "numeroPedido total estadoPedido estadoPago createdAt")
    .populate("clienteId", "nombreCompleto email")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
}

export async function listAdminCupones(promocionId?: string) {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (promocionId) {
    assertObjectId(promocionId, "ID de promoción inválido");
    query.promocionId = promocionId;
  }

  return Cupon.find(query)
    .populate("promocionId", "nombre estado tipo valor reglaNxM metodoActivacion fechaInicio fechaFin")
    .sort({ createdAt: -1 })
    .lean();
}

export async function createAdminCupon(
  input: CreateCuponInput,
  userId?: string | null
) {
  await connectDB();
  const promo = await Promocion.findById(input.promocionId).lean();
  if (!promo) {
    throw new AppError("La promoción asociada no existe", 404);
  }

  const existing = await Cupon.findOne({ codigo: input.codigo }).lean();
  if (existing) {
    throw new AppError(`Ya existe un cupón con el código "${input.codigo}"`, 409);
  }

  const created = await Cupon.create({
    ...input,
    creadoPor: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
  });

  return Cupon.findById(created._id)
    .populate("promocionId", "nombre estado tipo valor reglaNxM metodoActivacion fechaInicio fechaFin")
    .lean();
}

export async function updateAdminCupon(id: string, input: UpdateCuponInput) {
  assertObjectId(id, "ID de cupón inválido");
  await connectDB();

  if (input.codigo) {
    const duplicate = await Cupon.findOne({
      codigo: input.codigo,
      _id: { $ne: id },
    }).lean();
    if (duplicate) {
      throw new AppError(`Ya existe otro cupón con el código "${input.codigo}"`, 409);
    }
  }

  const updated = await Cupon.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  })
    .populate("promocionId", "nombre estado tipo valor reglaNxM metodoActivacion fechaInicio fechaFin")
    .lean();

  if (!updated) throw new AppError("Cupón no encontrado", 404);
  return updated;
}

export async function deleteAdminCupon(id: string) {
  assertObjectId(id, "ID de cupón inválido");
  await connectDB();

  const hasUsages = await UsoPromocion.exists({ cuponId: id });
  if (hasUsages) {
    throw new AppError(
      "No se puede eliminar un cupón que ya tiene usos registrados. Desactívelo en su lugar.",
      409
    );
  }

  const deleted = await Cupon.findByIdAndDelete(id);
  if (!deleted) throw new AppError("Cupón no encontrado", 404);
  return { deleted: true };
}
