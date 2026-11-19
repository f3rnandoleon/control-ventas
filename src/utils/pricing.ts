import { Producto, RebajaWeb, Variante } from "@/types/producto";

export const formatMoney = (value: number) => `Bs ${Number(value || 0).toFixed(2)}`;

export interface VariantPricingResult {
  precioVenta: number;
  precioCosto: number;
  ganancia: number;
  tienePrecioDiferenciado: boolean;
}

export interface WebVariantPricingResult extends VariantPricingResult {
  precioLista: number;
  descuentoUnitario: number;
  porcentajeDescuento: number;
  tieneRebaja: boolean;
}

export interface ProductPriceRangeResult {
  precioMinimo: number;
  precioMaximo: number;
  tieneRango: boolean;
}

/**
 * Obtiene el precio de venta, costo y margen de ganancia para una variante específica.
 * Implementa el patrón Fallback: si la variante no define precio o costo, hereda
 * automáticamente los valores base del producto padre.
 */
export function getVariantPricing(
  producto: { precioVenta: number; precioCosto?: number | null },
  variante?: { precioVenta?: number | null; precioCosto?: number | null } | Record<string, unknown> | null
): VariantPricingResult {
  const v = variante as { precioVenta?: number | null; precioCosto?: number | null } | null | undefined;
  const precioVenta =
    v?.precioVenta !== undefined &&
    v?.precioVenta !== null &&
    Number(v.precioVenta) > 0
      ? Number(v.precioVenta)
      : Number(producto.precioVenta || 0);

  const precioCosto =
    v?.precioCosto !== undefined &&
    v?.precioCosto !== null &&
    Number(v.precioCosto) > 0
      ? Number(v.precioCosto)
      : Number(producto.precioCosto || 0);

  const ganancia = precioVenta - precioCosto;

  const tienePrecioDiferenciado = Boolean(
    (v?.precioVenta && Number(v.precioVenta) !== Number(producto.precioVenta)) ||
    (v?.precioCosto && Number(v.precioCosto) !== Number(producto.precioCosto))
  );

  return {
    precioVenta,
    precioCosto,
    ganancia,
    tienePrecioDiferenciado,
  };
}

/**
 * Determina si una rebaja de catálogo web está activa y vigente en el instante `now`.
 */
export function isRebajaWebVigente(
  rebajaWeb?: RebajaWeb | null,
  now: Date = new Date()
): boolean {
  if (!rebajaWeb || !rebajaWeb.activa) return false;
  if (!Number.isFinite(Number(rebajaWeb.valor)) || Number(rebajaWeb.valor) <= 0) {
    return false;
  }

  const nowMs = now.getTime();

  if (rebajaWeb.fechaInicio) {
    const inicio = new Date(rebajaWeb.fechaInicio);
    if (!Number.isNaN(inicio.getTime()) && nowMs < inicio.getTime()) {
      return false;
    }
  }

  if (rebajaWeb.fechaFin) {
    const fin = new Date(rebajaWeb.fechaFin);
    if (!Number.isNaN(fin.getTime()) && nowMs > fin.getTime()) {
      return false;
    }
  }

  return true;
}

/**
 * Calcula el precio efectivo exclusivo para el canal WEB ("Antes / Ahora").
 * No altera el comportamiento de `getVariantPricing` usado por el POS físico.
 * Prioridad:
 * 1. `variante.precioOfertaWeb` si es > 0 y < precioLista (y sin fechas vencidas o rebaja activa)
 * 2. `producto.rebajaWeb` si está activa y vigente
 * 3. Fallback legado `producto.descuento` (0..100) si aún existiera en documentos sin migrar
 */
export function getWebVariantPricing(
  producto: {
    precioVenta: number;
    precioCosto?: number | null;
    rebajaWeb?: RebajaWeb | null;
    descuento?: number | null;
  },
  variante?:
    | {
        precioVenta?: number | null;
        precioCosto?: number | null;
        precioOfertaWeb?: number | null;
      }
    | Record<string, unknown>
    | null,
  now: Date = new Date()
): WebVariantPricingResult {
  const base = getVariantPricing(producto, variante);
  const precioLista = Number(base.precioVenta.toFixed(2));
  const v = variante as { precioOfertaWeb?: number | null } | null | undefined;

  let precioFinal = precioLista;

  const variantOffer =
    v?.precioOfertaWeb !== undefined && v?.precioOfertaWeb !== null
      ? Number(v.precioOfertaWeb)
      : 0;

  if (variantOffer > 0 && variantOffer < precioLista) {
    precioFinal = Number(variantOffer.toFixed(2));
  } else if (isRebajaWebVigente(producto.rebajaWeb, now)) {
    const rebaja = producto.rebajaWeb!;
    const valor = Number(rebaja.valor || 0);
    if (rebaja.tipo === "PRECIO_FIJO") {
      if (valor > 0 && valor < precioLista) {
        precioFinal = Number(valor.toFixed(2));
      }
    } else {
      const pct = Math.min(95, Math.max(0, valor));
      precioFinal = Number(Math.max(0, precioLista * (1 - pct / 100)).toFixed(2));
    }
  } else if (
    !producto.rebajaWeb &&
    producto.descuento !== undefined &&
    producto.descuento !== null &&
    Number(producto.descuento) > 0 &&
    Number(producto.descuento) < 100
  ) {
    const pct = Math.min(95, Math.max(0, Number(producto.descuento)));
    precioFinal = Number(Math.max(0, precioLista * (1 - pct / 100)).toFixed(2));
  }

  const descuentoUnitario = Number(Math.max(0, precioLista - precioFinal).toFixed(2));
  const tieneRebaja = descuentoUnitario > 0 && precioLista > 0;
  const porcentajeDescuento = tieneRebaja
    ? Math.round((descuentoUnitario / precioLista) * 100)
    : 0;

  return {
    precioLista,
    precioVenta: precioFinal,
    precioCosto: base.precioCosto,
    ganancia: Number((precioFinal - base.precioCosto).toFixed(2)),
    tienePrecioDiferenciado: base.tienePrecioDiferenciado,
    descuentoUnitario,
    porcentajeDescuento,
    tieneRebaja,
  };
}

/**
 * Calcula el rango de precios de venta (mínimo y máximo) entre todas las variantes
 * y el precio base del producto.
 */
export function getProductPriceRange(
  producto: Pick<Producto, "precioVenta"> & { variantes?: Pick<Variante, "precioVenta">[] }
): ProductPriceRangeResult {
  const basePrice = Number(producto.precioVenta || 0);
  const variantPrices: number[] = (producto.variantes || [])
    .map((v) => (v.precioVenta !== undefined && v.precioVenta !== null && Number(v.precioVenta) > 0 ? Number(v.precioVenta) : basePrice))
    .filter((price) => !Number.isNaN(price) && price > 0);

  if (variantPrices.length === 0) {
    return {
      precioMinimo: basePrice,
      precioMaximo: basePrice,
      tieneRango: false,
    };
  }

  const allPrices = [basePrice, ...variantPrices];
  const precioMinimo = Math.min(...allPrices);
  const precioMaximo = Math.max(...allPrices);

  return {
    precioMinimo,
    precioMaximo,
    tieneRango: precioMinimo !== precioMaximo,
  };
}

/**
 * Formatea el precio de un producto para visualización:
 * Ej: "Bs 120.00" si es fijo, o "Bs 100.00 - Bs 120.00" si varía por talla.
 */
export function formatProductPriceDisplay(
  producto: Pick<Producto, "precioVenta"> & { variantes?: Pick<Variante, "precioVenta">[] }
): string {
  const { precioMinimo, precioMaximo, tieneRango } = getProductPriceRange(producto);

  if (!tieneRango) {
    return formatMoney(precioMinimo);
  }

  return `${formatMoney(precioMinimo)} - ${formatMoney(precioMaximo)}`;
}

/**
 * Calcula el Costo Promedio Ponderado (CPP) para inventario:
 * (stockActual * costoActual + cantidadNueva * costoNuevo) / (stockActual + cantidadNueva)
 * Si el stock previo es <= 0, el nuevo costo es directamente costoNuevo.
 */
export function calcularCostoPromedioPonderado(
  stockActual: number,
  costoActual: number,
  cantidadNueva: number,
  costoNuevo: number
): number {
  const stockPrevio = Math.max(0, Number(stockActual || 0));
  const cantidadEntrada = Number(cantidadNueva || 0);
  const costoEntrada = Number(costoNuevo || 0);
  const costoPrevio = Number(costoActual || 0);

  if (cantidadEntrada <= 0) {
    return Number(costoPrevio.toFixed(2));
  }

  if (stockPrevio <= 0) {
    return Number(costoEntrada.toFixed(2));
  }

  const valorTotalActual = stockPrevio * costoPrevio;
  const valorTotalEntrada = cantidadEntrada * costoEntrada;
  const stockTotalFinal = stockPrevio + cantidadEntrada;

  if (stockTotalFinal <= 0) return 0;

  return Number(((valorTotalActual + valorTotalEntrada) / stockTotalFinal).toFixed(2));
}
