import type { MedidaTallaItem, MedidasPrenda, RebajaWeb, Variante } from "@/types/producto";
import {
  formatMoney,
  getWebVariantPricing,
} from "@/utils/pricing";
import {
  buildEffectiveMedidasPorTalla,
  resolveMedidasForTalla,
} from "@/utils/medidas";

type VariantStockShape = {
  talla?: string | null;
  stock?: number | null;
  stockReservado?: number | null;
  precioVenta?: number | null;
  precioOfertaWeb?: number | null;
  varianteId?: string | null;
  medidas?: MedidasPrenda | null;
};

export const matchesVariant = (current: Variante, target: Variante) => {
  if (current.varianteId && target.varianteId) {
    return current.varianteId === target.varianteId;
  }

  return (
    current.color === target.color &&
    (current.colorSecundario || "") === (target.colorSecundario || "") &&
    current.talla === target.talla
  );
};

export const getVariantReservedStock = (
  variant: { stockReservado?: number | null }
) =>
  Math.max(0, variant.stockReservado || 0);

export const getVariantAvailableStock = (
  variant: { stock?: number | null; stockReservado?: number | null }
) => Math.max(0, (variant.stock || 0) - getVariantReservedStock(variant));

export const withVariantAvailability = <
  T extends {
    medidasPorTalla?: MedidaTallaItem[] | null;
    variantes?: Array<Record<string, unknown> & VariantStockShape>;
    stockTotal?: number;
  },
>(
  producto: T
) => {
  const effectiveMedidasPorTalla = buildEffectiveMedidasPorTalla(producto);

  return {
    ...producto,
    medidasPorTalla: effectiveMedidasPorTalla,
    variantes: (producto.variantes ?? []).map((variante) => ({
      ...variante,
      medidas: resolveMedidasForTalla(
        { medidasPorTalla: effectiveMedidasPorTalla, variantes: producto.variantes },
        variante.talla,
        variante.medidas
      ),
      stockReservado: getVariantReservedStock(variante),
      stockDisponible: getVariantAvailableStock(variante),
    })),
  };
};

export interface WebVariantStockRef {
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
}

/**
 * Transforma un producto para la vista pública de catálogo/tienda web:
 * 1. Calcula las existencias reales basándose exclusivamente en sucursales autorizadas para despacho web.
 * 2. Resuelve el precioLista ("Antes") y precioVenta efectivo ("Ahora") por variante (exclusivo web).
 * 3. Incorpora métricas consolidadas: precioMinimo, precioMaximo, precioMinimoLista, precioMaximoLista,
 *    tieneRebaja, porcentajeDescuentoMaximo, tieneRangoPrecios, precioDisplay y stockDisponible.
 */
export const withWebVariantAvailability = <
  T extends {
    _id?: unknown;
    precioVenta?: number;
    rebajaWeb?: RebajaWeb | null;
    descuento?: number | null;
    medidasPorTalla?: MedidaTallaItem[] | null;
    variantes?: Array<Record<string, unknown> & VariantStockShape>;
    stockTotal?: number;
  },
>(
  producto: T,
  webStockMap?: Map<string, WebVariantStockRef>,
  now: Date = new Date()
) => {
  const baseProductPrice = Number(producto.precioVenta || 0);
  const isTrackedByBranches = Boolean(webStockMap);
  const effectiveMedidasPorTalla = buildEffectiveMedidasPorTalla(producto);

  const productBasePricing = getWebVariantPricing(
    {
      precioVenta: baseProductPrice,
      rebajaWeb: producto.rebajaWeb,
      descuento: producto.descuento,
    },
    null,
    now
  );

  const variantesProcesadas = (producto.variantes ?? []).map((variante) => {
    const varKey = (variante.varianteId as string) || "";
    const webStock = webStockMap?.get(varKey);

    let stock: number;
    let stockReservado: number;
    let stockDisponible: number;

    if (webStock !== undefined) {
      stock = webStock.stockFisico;
      stockReservado = webStock.stockReservado;
      stockDisponible = webStock.stockDisponible;
    } else if (isTrackedByBranches) {
      stock = 0;
      stockReservado = 0;
      stockDisponible = 0;
    } else {
      stock = Math.max(0, variante.stock || 0);
      stockReservado = getVariantReservedStock(variante);
      stockDisponible = getVariantAvailableStock(variante);
    }

    const webPricing = getWebVariantPricing(
      {
        precioVenta: baseProductPrice,
        rebajaWeb: producto.rebajaWeb,
        descuento: producto.descuento,
      },
      variante,
      now
    );

    return {
      ...variante,
      medidas: resolveMedidasForTalla(
        { medidasPorTalla: effectiveMedidasPorTalla, variantes: producto.variantes },
        variante.talla,
        variante.medidas
      ),
      precioLista: webPricing.precioLista,
      precioVenta: webPricing.precioVenta,
      tieneRebaja: webPricing.tieneRebaja,
      porcentajeDescuento: webPricing.porcentajeDescuento,
      stock,
      stockReservado,
      stockDisponible,
    };
  });

  const stockTotalWeb = variantesProcesadas.reduce((acc, v) => acc + (v.stock || 0), 0);
  const stockReservadoWeb = variantesProcesadas.reduce((acc, v) => acc + (v.stockReservado || 0), 0);
  const stockDisponibleWeb = variantesProcesadas.reduce((acc, v) => acc + (v.stockDisponible || 0), 0);

  const effectivePrices =
    variantesProcesadas.length > 0
      ? variantesProcesadas.map((v) => v.precioVenta).filter((p) => Number.isFinite(p) && p > 0)
      : [productBasePricing.precioVenta];
  const listPrices =
    variantesProcesadas.length > 0
      ? variantesProcesadas.map((v) => v.precioLista).filter((p) => Number.isFinite(p) && p > 0)
      : [productBasePricing.precioLista];

  const precioMinimo = effectivePrices.length > 0 ? Math.min(...effectivePrices) : productBasePricing.precioVenta;
  const precioMaximo = effectivePrices.length > 0 ? Math.max(...effectivePrices) : productBasePricing.precioVenta;
  const precioMinimoLista = listPrices.length > 0 ? Math.min(...listPrices) : productBasePricing.precioLista;
  const precioMaximoLista = listPrices.length > 0 ? Math.max(...listPrices) : productBasePricing.precioLista;

  const tieneRangoPrecios = precioMinimo !== precioMaximo;
  const precioDisplay = tieneRangoPrecios
    ? `${formatMoney(precioMinimo)} - ${formatMoney(precioMaximo)}`
    : formatMoney(precioMinimo);

  const tieneRebaja =
    variantesProcesadas.length > 0
      ? variantesProcesadas.some((v) => v.tieneRebaja)
      : productBasePricing.tieneRebaja;
  const porcentajeDescuentoMaximo =
    variantesProcesadas.length > 0
      ? Math.max(0, ...variantesProcesadas.map((v) => v.porcentajeDescuento || 0))
      : productBasePricing.porcentajeDescuento;

  return {
    ...producto,
    medidasPorTalla: effectiveMedidasPorTalla,
    precioLista: productBasePricing.precioLista,
    precioVenta: productBasePricing.precioVenta,
    tieneRebaja,
    porcentajeDescuentoMaximo,
    stockTotal: stockTotalWeb,
    stockReservadoTotal: stockReservadoWeb,
    stockDisponible: stockDisponibleWeb,
    precioMinimo,
    precioMaximo,
    precioMinimoLista,
    precioMaximoLista,
    tieneRangoPrecios,
    precioDisplay,
    variantes: variantesProcesadas,
  };
};


export const withComputedStock = <T extends { stockTotal?: number; stockMinimo?: number; variantes?: Array<{ stock?: number | null }> }>(
  producto: T
) => {
  const variantes = producto.variantes ?? [];
  const stockTotal = variantes.length
    ? variantes.reduce((total, variante) => total + Math.max(0, variante.stock || 0), 0)
    : Math.max(0, producto.stockTotal || 0);
  const stockReservadoTotal = variantes.reduce(
    (total, variante) =>
      total + getVariantReservedStock(variante as VariantStockShape),
    0
  );

  return {
    ...producto,
    stockTotal,
    stockReservadoTotal,
    stockDisponible: Math.max(0, stockTotal - stockReservadoTotal),
    stockMinimo: producto.stockMinimo ?? 5,
  };
};
