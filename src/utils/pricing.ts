import { Producto, Variante } from "@/types/producto";

export const formatMoney = (value: number) => `Bs ${Number(value || 0).toFixed(2)}`;

export interface VariantPricingResult {
  precioVenta: number;
  precioCosto: number;
  ganancia: number;
  tienePrecioDiferenciado: boolean;
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
