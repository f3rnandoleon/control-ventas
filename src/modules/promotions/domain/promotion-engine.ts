import type {
  AlcancePromocion,
  CanalPromocion,
  CondicionesPromocion,
  EstadoPromocion,
  EvaluacionPromocionesResult,
  ItemEvaluadoPromocion,
  MetodoActivacionPromocion,
  PromocionAplicadaSnapshot,
  ReglaNxM,
  TipoPromocion,
} from "@/types/promocion";

export function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export interface EngineLineInput {
  productoId: string;
  varianteId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  categoria?: string;
  cantidad: number;
  precioUnitarioLista: number;
  precioWebEfectivo: number;
  precioCosto: number;
  tieneRebajaCatalogo: boolean;
}

export interface EnginePromocionRule {
  _id: string;
  nombre: string;
  estado: EstadoPromocion;
  canales: CanalPromocion[];
  metodoActivacion: MetodoActivacionPromocion;
  tipo: TipoPromocion;
  valor: number;
  reglaNxM?: ReglaNxM | null;
  descuentoMaximo?: number | null;
  alcance: AlcancePromocion;
  productosIncluidos: string[];
  categoriasIncluidas: string[];
  productosExcluidos: string[];
  condiciones: CondicionesPromocion;
  prioridad: number;
  acumulable: boolean;
  acumulableConRebajasCatalogo: boolean;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  usoMaximoTotal?: number | null;
  usoMaximoPorCliente?: number | null;
  usosActuales: number;
}

export interface EngineCuponContext {
  _id: string;
  codigo: string;
  activo: boolean;
  usoMaximoTotal?: number | null;
  usoMaximoPorCliente?: number | null;
  usosActuales: number;
  usosClienteActuales: number;
  promocion: EnginePromocionRule;
}

export interface EvaluatePromotionsEngineInput {
  items: EngineLineInput[];
  costoEnvio?: number;
  canal?: CanalPromocion;
  promocionesAutomaticas: EnginePromocionRule[];
  usosClientePorPromocion?: Record<string, number>;
  cuponCodigoSolicitado?: string | null;
  cuponContext?: EngineCuponContext | null;
  esPrimeraCompra?: boolean;
  now?: Date;
}

interface MutableLineState {
  input: EngineLineInput;
  totalBrutoLista: number;
  descuentoCatalogo: number;
  descuentoLinea: number;
  descuentoProrrateado: number;
  remaining: number;
}

function isPromotionWithinDateWindow(promo: EnginePromocionRule, now: Date): boolean {
  const nowMs = now.getTime();
  if (promo.fechaInicio) {
    const start = new Date(promo.fechaInicio);
    if (!Number.isNaN(start.getTime()) && nowMs < start.getTime()) {
      return false;
    }
  }
  if (promo.fechaFin) {
    const end = new Date(promo.fechaFin);
    if (!Number.isNaN(end.getTime()) && nowMs > end.getTime()) {
      return false;
    }
  }
  return true;
}

function normalizeText(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function getEligibleLines(
  lines: MutableLineState[],
  promo: EnginePromocionRule
): MutableLineState[] {
  const excludedSet = new Set((promo.productosExcluidos || []).map(String));
  const includedProdSet = new Set((promo.productosIncluidos || []).map(String));
  const includedCatSet = new Set((promo.categoriasIncluidas || []).map(normalizeText));

  return lines.filter((line) => {
    if (line.remaining <= 0) return false;
    if (excludedSet.has(String(line.input.productoId))) return false;
    if (!promo.acumulableConRebajasCatalogo && line.input.tieneRebajaCatalogo) {
      return false;
    }

    if (promo.alcance === "PRODUCTOS") {
      return includedProdSet.has(String(line.input.productoId));
    }

    if (promo.alcance === "CATEGORIAS") {
      return includedCatSet.has(normalizeText(line.input.categoria));
    }

    return true;
  });
}

/**
 * Prorratea `amountToAllocate` proporcionalmente entre `lines` según su `remaining` actual,
 * ajustando cualquier residuo de centavos en la última línea elegible para mantener suma exacta.
 */
function allocateProportionally(
  lines: MutableLineState[],
  amountToAllocate: number,
  targetField: "descuentoLinea" | "descuentoProrrateado"
): number {
  const totalBase = roundMoney(lines.reduce((sum, l) => sum + l.remaining, 0));
  const capped = roundMoney(Math.min(Math.max(0, amountToAllocate), totalBase));
  if (capped <= 0 || totalBase <= 0 || lines.length === 0) {
    return 0;
  }

  let allocatedSoFar = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1;
    let share: number;

    if (isLast) {
      share = roundMoney(Math.min(line.remaining, capped - allocatedSoFar));
    } else {
      share = roundMoney(Math.min(line.remaining, (capped * line.remaining) / totalBase));
    }

    if (share > 0) {
      line[targetField] = roundMoney(line[targetField] + share);
      line.remaining = roundMoney(Math.max(0, line.remaining - share));
      allocatedSoFar = roundMoney(allocatedSoFar + share);
    }
  }

  // Ajuste defensivo si la última línea topó su `remaining`
  let diff = roundMoney(capped - allocatedSoFar);
  if (diff > 0) {
    for (const line of lines) {
      if (diff <= 0) break;
      const extra = roundMoney(Math.min(line.remaining, diff));
      if (extra > 0) {
        line[targetField] = roundMoney(line[targetField] + extra);
        line.remaining = roundMoney(Math.max(0, line.remaining - extra));
        allocatedSoFar = roundMoney(allocatedSoFar + extra);
        diff = roundMoney(capped - allocatedSoFar);
      }
    }
  }

  return allocatedSoFar;
}

function applyNxMDiscount(
  eligibleLines: MutableLineState[],
  regla: ReglaNxM,
  descuentoMaximo?: number | null
): number {
  if (!regla || regla.lleva < 2 || regla.paga < 1 || regla.paga >= regla.lleva) {
    return 0;
  }

  const units: Array<{ line: MutableLineState; unitRemaining: number }> = [];
  for (const line of eligibleLines) {
    const qty = Math.max(0, Math.floor(line.input.cantidad));
    if (qty === 0 || line.remaining <= 0) continue;
    const unitPrice = line.remaining / qty;
    for (let u = 0; u < qty; u++) {
      units.push({ line, unitRemaining: unitPrice });
    }
  }

  const totalUnits = units.length;
  const groups = Math.floor(totalUnits / regla.lleva);
  const freeUnitsCount = groups * (regla.lleva - regla.paga);
  if (freeUnitsCount <= 0) return 0;

  // Estándar de industria en ropa: las prendas bonificadas son las de MENOR valor
  units.sort((a, b) => a.unitRemaining - b.unitRemaining);

  const lineRawDiscounts = new Map<MutableLineState, number>();
  let rawTotal = 0;
  for (let i = 0; i < freeUnitsCount; i++) {
    const target = units[i];
    const prev = lineRawDiscounts.get(target.line) || 0;
    lineRawDiscounts.set(target.line, prev + target.unitRemaining);
    rawTotal += target.unitRemaining;
  }

  rawTotal = roundMoney(rawTotal);
  const cappedTotal =
    descuentoMaximo && descuentoMaximo > 0 ? roundMoney(Math.min(rawTotal, descuentoMaximo)) : rawTotal;
  if (cappedTotal <= 0) return 0;

  const ratio = rawTotal > 0 ? cappedTotal / rawTotal : 0;
  const entries = Array.from(lineRawDiscounts.entries());
  let appliedTotal = 0;

  for (let i = 0; i < entries.length; i++) {
    const [line, rawLineDisc] = entries[i];
    const isLast = i === entries.length - 1;
    const share = isLast
      ? roundMoney(Math.min(line.remaining, cappedTotal - appliedTotal))
      : roundMoney(Math.min(line.remaining, rawLineDisc * ratio));

    if (share > 0) {
      line.descuentoLinea = roundMoney(line.descuentoLinea + share);
      line.remaining = roundMoney(Math.max(0, line.remaining - share));
      appliedTotal = roundMoney(appliedTotal + share);
    }
  }

  return appliedTotal;
}

function applySecondUnitDiscount(
  eligibleLines: MutableLineState[],
  percentage: number,
  descuentoMaximo?: number | null
): number {
  const pct = Math.min(100, Math.max(0, Number(percentage || 0)));
  if (pct <= 0) return 0;

  const units: Array<{ line: MutableLineState; unitRemaining: number }> = [];
  for (const line of eligibleLines) {
    const qty = Math.max(0, Math.floor(line.input.cantidad));
    if (qty === 0 || line.remaining <= 0) continue;
    const unitPrice = line.remaining / qty;
    for (let u = 0; u < qty; u++) {
      units.push({ line, unitRemaining: unitPrice });
    }
  }

  const discountedUnitsCount = Math.floor(units.length / 2);
  if (discountedUnitsCount <= 0) return 0;

  units.sort((a, b) => a.unitRemaining - b.unitRemaining);

  const lineRawDiscounts = new Map<MutableLineState, number>();
  let rawTotal = 0;
  for (let i = 0; i < discountedUnitsCount; i++) {
    const target = units[i];
    const disc = target.unitRemaining * (pct / 100);
    const prev = lineRawDiscounts.get(target.line) || 0;
    lineRawDiscounts.set(target.line, prev + disc);
    rawTotal += disc;
  }

  rawTotal = roundMoney(rawTotal);
  const cappedTotal =
    descuentoMaximo && descuentoMaximo > 0 ? roundMoney(Math.min(rawTotal, descuentoMaximo)) : rawTotal;
  if (cappedTotal <= 0) return 0;

  const ratio = rawTotal > 0 ? cappedTotal / rawTotal : 0;
  const entries = Array.from(lineRawDiscounts.entries());
  let appliedTotal = 0;

  for (let i = 0; i < entries.length; i++) {
    const [line, rawLineDisc] = entries[i];
    const isLast = i === entries.length - 1;
    const share = isLast
      ? roundMoney(Math.min(line.remaining, cappedTotal - appliedTotal))
      : roundMoney(Math.min(line.remaining, rawLineDisc * ratio));

    if (share > 0) {
      line.descuentoLinea = roundMoney(line.descuentoLinea + share);
      line.remaining = roundMoney(Math.max(0, line.remaining - share));
      appliedTotal = roundMoney(appliedTotal + share);
    }
  }

  return appliedTotal;
}

interface EvaluationFailure {
  code: string;
  message: string;
}

function checkRuleEligibility(
  promo: EnginePromocionRule,
  lines: MutableLineState[],
  canal: CanalPromocion,
  usosClientePromocion: number,
  esPrimeraCompra: boolean,
  now: Date,
  cupon?: EngineCuponContext | null
): { ok: true; eligibleLines: MutableLineState[] } | { ok: false; failure: EvaluationFailure } {
  if (promo.estado !== "ACTIVA" || !isPromotionWithinDateWindow(promo, now)) {
    return {
      ok: false,
      failure: {
        code: "CUPON_EXPIRADO",
        message: "La promoción o cupón no está vigente en este momento",
      },
    };
  }

  if (!promo.canales.includes(canal)) {
    return {
      ok: false,
      failure: {
        code: "CANAL_NO_HABILITADO",
        message: "La promoción no está disponible para este canal",
      },
    };
  }

  if (promo.usoMaximoTotal !== null && promo.usoMaximoTotal !== undefined && promo.usosActuales >= promo.usoMaximoTotal) {
    return {
      ok: false,
      failure: {
        code: "CUPON_LIMITE_ALCANZADO",
        message: "Esta promoción alcanzó su límite máximo de usos",
      },
    };
  }

  if (
    promo.usoMaximoPorCliente !== null &&
    promo.usoMaximoPorCliente !== undefined &&
    usosClientePromocion >= promo.usoMaximoPorCliente
  ) {
    return {
      ok: false,
      failure: {
        code: "CUPON_LIMITE_ALCANZADO",
        message: "Ya utilizaste esta promoción el máximo de veces permitido",
      },
    };
  }

  if (cupon) {
    if (!cupon.activo) {
      return {
        ok: false,
        failure: { code: "CUPON_INVALIDO", message: "El cupón se encuentra desactivado" },
      };
    }
    if (
      cupon.usoMaximoTotal !== null &&
      cupon.usoMaximoTotal !== undefined &&
      cupon.usosActuales >= cupon.usoMaximoTotal
    ) {
      return {
        ok: false,
        failure: { code: "CUPON_LIMITE_ALCANZADO", message: "El cupón alcanzó su límite máximo de usos" },
      };
    }
    if (
      cupon.usoMaximoPorCliente !== null &&
      cupon.usoMaximoPorCliente !== undefined &&
      cupon.usosClienteActuales >= cupon.usoMaximoPorCliente
    ) {
      return {
        ok: false,
        failure: {
          code: "CUPON_LIMITE_ALCANZADO",
          message: "Ya utilizaste este cupón el máximo de veces permitido",
        },
      };
    }
  }

  if (promo.condiciones?.soloPrimeraCompra && !esPrimeraCompra) {
    return {
      ok: false,
      failure: {
        code: "SOLO_PRIMERA_COMPRA",
        message: "Esta promoción es válida únicamente para la primera compra",
      },
    };
  }

  const eligibleLines = getEligibleLines(lines, promo);
  if (promo.tipo !== "ENVIO_GRATIS" && eligibleLines.length === 0) {
    const hasMarkdownItems = lines.some((l) => l.input.tieneRebajaCatalogo);
    return {
      ok: false,
      failure: {
        code: "NO_APLICA_A_PRODUCTOS",
        message:
          hasMarkdownItems && !promo.acumulableConRebajasCatalogo
            ? "Esta promoción no es acumulable con productos que ya tienen rebaja de catálogo"
            : "Ninguna prenda del carrito califica para esta promoción",
      },
    };
  }

  const baseForMinCheck = promo.tipo === "ENVIO_GRATIS" ? lines : eligibleLines;
  const subtotalElegible = roundMoney(baseForMinCheck.reduce((s, l) => s + l.remaining, 0));
  const cantidadElegible = baseForMinCheck.reduce((s, l) => s + l.input.cantidad, 0);

  const minCompra = Number(promo.condiciones?.montoMinimoCompra || 0);
  if (minCompra > 0 && subtotalElegible < minCompra) {
    return {
      ok: false,
      failure: {
        code: "MONTO_MINIMO_NO_ALCANZADO",
        message: `Requiere una compra mínima elegible de Bs ${minCompra.toFixed(2)}`,
      },
    };
  }

  const minPrendas = Number(promo.condiciones?.cantidadMinimaPrendas || 0);
  if (minPrendas > 0 && cantidadElegible < minPrendas) {
    return {
      ok: false,
      failure: {
        code: "CANTIDAD_MINIMA_NO_ALCANZADA",
        message: `Requiere al menos ${minPrendas} prendas elegibles`,
      },
    };
  }

  return { ok: true, eligibleLines };
}

/**
 * Motor puro y determinista de cálculo de promociones y prorrateo para el canal WEB.
 */
export function evaluatePromotionsEngine(
  input: EvaluatePromotionsEngineInput
): EvaluacionPromocionesResult {
  const canal: CanalPromocion = input.canal || "WEB";
  const now = input.now || new Date();
  const costoEnvioOriginal = roundMoney(Math.max(0, input.costoEnvio || 0));
  const esPrimeraCompra = Boolean(input.esPrimeraCompra);
  const usosClienteMap = input.usosClientePorPromocion || {};

  const lines: MutableLineState[] = (input.items || []).map((item) => {
    const qty = Math.max(1, Math.floor(item.cantidad));
    const totalBrutoLista = roundMoney(item.precioUnitarioLista * qty);
    const totalPostCatalogo = roundMoney(item.precioWebEfectivo * qty);
    const descuentoCatalogo = roundMoney(Math.max(0, totalBrutoLista - totalPostCatalogo));

    return {
      input: item,
      totalBrutoLista,
      descuentoCatalogo,
      descuentoLinea: 0,
      descuentoProrrateado: 0,
      remaining: totalPostCatalogo,
    };
  });

  const subtotalLista = roundMoney(lines.reduce((s, l) => s + l.totalBrutoLista, 0));
  const descuentoCatalogo = roundMoney(lines.reduce((s, l) => s + l.descuentoCatalogo, 0));
  const subtotalPostCatalogo = roundMoney(lines.reduce((s, l) => s + l.remaining, 0));

  const promocionesAplicadas: PromocionAplicadaSnapshot[] = [];
  let descuentoEnvio = 0;

  let hasNonShippingPromo = false;
  let lockedExclusiveNonShipping = false;

  const cuponCodigoNormalized = input.cuponCodigoSolicitado
    ? input.cuponCodigoSolicitado.trim().toUpperCase()
    : null;
  let cuponValido = false;
  let cuponErrorCodigo: string | null = null;
  let cuponErrorMensaje: string | null = null;

  // 1. Construir cola ordenada de candidatos:
  //    Las promociones de nivel línea/combo (PRODUCTOS/CATEGORIAS/NXM/SEGUNDA_UNIDAD) se evalúan
  //    antes que las de carrito (PEDIDO), y dentro de cada grupo por prioridad ascendente.
  interface CandidateRule {
    promo: EnginePromocionRule;
    cupon?: EngineCuponContext | null;
    phase: number; // 1 = línea/combo, 2 = pedido/carrito, 3 = envío
  }

  const getPhase = (promo: EnginePromocionRule) => {
    if (promo.tipo === "ENVIO_GRATIS" || promo.alcance === "ENVIO") return 3;
    if (
      promo.tipo === "NXM" ||
      promo.tipo === "SEGUNDA_UNIDAD" ||
      promo.alcance === "PRODUCTOS" ||
      promo.alcance === "CATEGORIAS"
    ) {
      return 1;
    }
    return 2;
  };

  const candidates: CandidateRule[] = [];

  for (const promo of input.promocionesAutomaticas || []) {
    if (promo.metodoActivacion !== "AUTOMATICA") continue;
    candidates.push({ promo, cupon: null, phase: getPhase(promo) });
  }

  if (cuponCodigoNormalized) {
    if (!input.cuponContext) {
      cuponErrorCodigo = "CUPON_INVALIDO";
      cuponErrorMensaje = `El cupón "${cuponCodigoNormalized}" no existe o no es válido`;
    } else {
      candidates.push({
        promo: input.cuponContext.promocion,
        cupon: input.cuponContext,
        phase: getPhase(input.cuponContext.promocion),
      });
    }
  }

  candidates.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    if (a.promo.prioridad !== b.promo.prioridad) return a.promo.prioridad - b.promo.prioridad;
    // Si empatan en fase y prioridad, priorizar el cupón que ingresó explícitamente el cliente
    const aIsCoupon = a.cupon ? 0 : 1;
    const bIsCoupon = b.cupon ? 0 : 1;
    return aIsCoupon - bIsCoupon;
  });

  const appliedPromoIds = new Set<string>();

  for (const candidate of candidates) {
    const { promo, cupon } = candidate;
    if (appliedPromoIds.has(promo._id)) continue;

    const isShippingRule = promo.tipo === "ENVIO_GRATIS" || promo.alcance === "ENVIO";

    if (!isShippingRule) {
      if (lockedExclusiveNonShipping || (hasNonShippingPromo && !promo.acumulable)) {
        if (cupon) {
          cuponErrorCodigo = "NO_ACUMULABLE";
          cuponErrorMensaje = "Este cupón no se puede combinar con otra promoción activa";
        }
        continue;
      }
    }

    const usosCliente = usosClienteMap[promo._id] || 0;
    const check = checkRuleEligibility(
      promo,
      lines,
      canal,
      usosCliente,
      esPrimeraCompra,
      now,
      cupon
    );

    if (!check.ok) {
      if (cupon) {
        cuponErrorCodigo = check.failure.code;
        cuponErrorMensaje = check.failure.message;
      }
      continue;
    }

    let montoDescontado = 0;

    if (promo.tipo === "ENVIO_GRATIS") {
      if (costoEnvioOriginal > descuentoEnvio) {
        montoDescontado = roundMoney(costoEnvioOriginal - descuentoEnvio);
        descuentoEnvio = costoEnvioOriginal;
      }
      // Incluso si el envío ya era 0, si era un cupón de envío gratis lo marcamos aplicado
      if (montoDescontado > 0 || cupon) {
        appliedPromoIds.add(promo._id);
        promocionesAplicadas.push({
          promocionId: promo._id,
          cuponId: cupon?._id || null,
          codigoCupon: cupon?.codigo || null,
          nombre: promo.nombre,
          tipo: promo.tipo,
          alcance: promo.alcance,
          montoDescontado,
        });
        if (cupon) {
          cuponValido = true;
          cuponErrorCodigo = null;
          cuponErrorMensaje = null;
        }
      }
      continue;
    }

    if (promo.tipo === "NXM" && promo.reglaNxM) {
      montoDescontado = applyNxMDiscount(
        check.eligibleLines,
        promo.reglaNxM,
        promo.descuentoMaximo
      );
    } else if (promo.tipo === "SEGUNDA_UNIDAD") {
      montoDescontado = applySecondUnitDiscount(
        check.eligibleLines,
        promo.valor,
        promo.descuentoMaximo
      );
    } else if (promo.tipo === "PORCENTAJE") {
      const pct = Math.min(100, Math.max(0, Number(promo.valor || 0)));
      const eligibleSum = roundMoney(
        check.eligibleLines.reduce((s, l) => s + l.remaining, 0)
      );
      let rawDiscount = roundMoney(eligibleSum * (pct / 100));
      if (promo.descuentoMaximo && promo.descuentoMaximo > 0) {
        rawDiscount = roundMoney(Math.min(rawDiscount, promo.descuentoMaximo));
      }
      const targetField =
        promo.alcance === "PEDIDO" ? "descuentoProrrateado" : "descuentoLinea";
      montoDescontado = allocateProportionally(check.eligibleLines, rawDiscount, targetField);
    } else if (promo.tipo === "MONTO_FIJO") {
      const targetField =
        promo.alcance === "PEDIDO" ? "descuentoProrrateado" : "descuentoLinea";
      montoDescontado = allocateProportionally(check.eligibleLines, promo.valor, targetField);
    }

    if (montoDescontado > 0) {
      appliedPromoIds.add(promo._id);
      hasNonShippingPromo = true;
      if (!promo.acumulable) {
        lockedExclusiveNonShipping = true;
      }
      promocionesAplicadas.push({
        promocionId: promo._id,
        cuponId: cupon?._id || null,
        codigoCupon: cupon?.codigo || null,
        nombre: promo.nombre,
        tipo: promo.tipo,
        alcance: promo.alcance,
        montoDescontado,
      });
      if (cupon) {
        cuponValido = true;
        cuponErrorCodigo = null;
        cuponErrorMensaje = null;
      }
    } else if (cupon) {
      cuponErrorCodigo = "NO_APLICA_A_PRODUCTOS";
      cuponErrorMensaje = "El cupón no generó descuento sobre las prendas actuales";
    }
  }

  const itemsEvaluados: ItemEvaluadoPromocion[] = lines.map((line) => {
    const totalLineaNeto = roundMoney(
      Math.max(
        0,
        line.totalBrutoLista -
          line.descuentoCatalogo -
          line.descuentoLinea -
          line.descuentoProrrateado
      )
    );
    const costoTotalLinea = roundMoney(line.input.precioCosto * line.input.cantidad);
    const gananciaNeta = roundMoney(totalLineaNeto - costoTotalLinea);

    return {
      productoId: line.input.productoId,
      varianteId: line.input.varianteId,
      color: line.input.color,
      colorSecundario: line.input.colorSecundario,
      talla: line.input.talla,
      categoria: line.input.categoria,
      cantidad: line.input.cantidad,
      precioUnitarioLista: line.input.precioUnitarioLista,
      precioWebEfectivo: line.input.precioWebEfectivo,
      precioCosto: line.input.precioCosto,
      tieneRebajaCatalogo: line.input.tieneRebajaCatalogo,
      descuentoCatalogo: line.descuentoCatalogo,
      descuentoLinea: line.descuentoLinea,
      descuentoProrrateado: line.descuentoProrrateado,
      totalLineaBruto: line.totalBrutoLista,
      totalLineaNeto,
      gananciaNeta,
    };
  });

  const descuentoPromocionesProductos = roundMoney(
    itemsEvaluados.reduce((s, it) => s + it.descuentoLinea + it.descuentoProrrateado, 0)
  );
  const descuentoPromociones = roundMoney(descuentoPromocionesProductos + descuentoEnvio);
  const descuentoTotal = roundMoney(descuentoCatalogo + descuentoPromociones);
  const costoEnvioFinal = roundMoney(Math.max(0, costoEnvioOriginal - descuentoEnvio));
  const totalProductosNeto = roundMoney(
    itemsEvaluados.reduce((s, it) => s + it.totalLineaNeto, 0)
  );
  const totalFinal = roundMoney(Math.max(0, totalProductosNeto + costoEnvioFinal));
  const gananciaTotalNeta = roundMoney(
    itemsEvaluados.reduce((s, it) => s + it.gananciaNeta, 0)
  );

  return {
    subtotalLista,
    subtotalPostCatalogo,
    descuentoCatalogo,
    descuentoPromociones,
    descuentoEnvio,
    descuentoTotal,
    costoEnvioOriginal,
    costoEnvioFinal,
    totalFinal,
    gananciaTotalNeta,
    promocionesAplicadas,
    items: itemsEvaluados,
    cuponCodigo: cuponCodigoNormalized,
    cuponValido,
    cuponErrorCodigo,
    cuponErrorMensaje,
  };
}
