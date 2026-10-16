import type { Variante } from "@/types/producto";
import {
  getVariantPricing,
  getProductPriceRange,
  formatProductPriceDisplay,
} from "@/utils/pricing";

type VariantStockShape = {
  stock?: number | null;
  stockReservado?: number | null;
  precioVenta?: number | null;
  varianteId?: string | null;
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
    variantes?: Array<Record<string, unknown> & VariantStockShape>;
    stockTotal?: number;
  },
>(
  producto: T
) => ({
  ...producto,
  variantes: (producto.variantes ?? []).map((variante) => ({
    ...variante,
    stockReservado: getVariantReservedStock(variante),
    stockDisponible: getVariantAvailableStock(variante),
  })),
});

export interface WebVariantStockRef {
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
}

/**
 * Transforma un producto para la vista pública de catálogo/tienda web:
 * 1. Calcula las existencias reales basándose exclusivamente en sucursales autorizadas para despacho web.
 * 2. Resuelve el precioVenta efectivo por variante (fallback automático al precio base del producto).
 * 3. Incorpora métricas consolidadas: precioMinimo, precioMaximo, tieneRangoPrecios, precioDisplay y stockDisponible.
 */
export const withWebVariantAvailability = <
  T extends {
    _id?: unknown;
    precioVenta?: number;
    variantes?: Array<Record<string, unknown> & VariantStockShape>;
    stockTotal?: number;
  },
>(
  producto: T,
  webStockMap?: Map<string, WebVariantStockRef>
) => {
  const baseProductPrice = Number(producto.precioVenta || 0);
  const isTrackedByBranches = Boolean(webStockMap);

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

    const pricing = getVariantPricing({ precioVenta: baseProductPrice }, variante);
    const precioVenta = pricing.precioVenta;

    return {
      ...variante,
      precioVenta,
      stock,
      stockReservado,
      stockDisponible,
    };
  });


  const stockTotalWeb = variantesProcesadas.reduce((acc, v) => acc + (v.stock || 0), 0);
  const stockReservadoWeb = variantesProcesadas.reduce((acc, v) => acc + (v.stockReservado || 0), 0);
  const stockDisponibleWeb = variantesProcesadas.reduce((acc, v) => acc + (v.stockDisponible || 0), 0);

  const priceRange = getProductPriceRange({
    precioVenta: baseProductPrice,
    variantes: variantesProcesadas,
  });

  return {
    ...producto,
    stockTotal: stockTotalWeb,
    stockReservadoTotal: stockReservadoWeb,
    stockDisponible: stockDisponibleWeb,
    precioMinimo: priceRange.precioMinimo,
    precioMaximo: priceRange.precioMaximo,
    tieneRangoPrecios: priceRange.tieneRango,
    precioDisplay: formatProductPriceDisplay({
      precioVenta: baseProductPrice,
      variantes: variantesProcesadas,
    }),
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
