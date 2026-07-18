import type { Producto, Variante } from "@/types/producto";

export type EstadoStock = "EN_STOCK" | "BAJO_STOCK" | "SIN_STOCK";

const nonNegative = (value: number | null | undefined) =>
  Number.isFinite(value) ? Math.max(0, Number(value)) : 0;

export function getStockFisicoVariante(variante: Pick<Variante, "stock">) {
  return nonNegative(variante.stock);
}

export function getStockReservadoVariante(
  variante: Pick<Variante, "stockReservado">
) {
  return nonNegative(variante.stockReservado);
}

export function getStockDisponibleVariante(
  variante: Pick<Variante, "stock" | "stockReservado" | "stockDisponible">
) {
  if (variante.stockDisponible !== undefined) {
    return nonNegative(variante.stockDisponible);
  }

  return Math.max(
    getStockFisicoVariante(variante) - getStockReservadoVariante(variante),
    0
  );
}

export function getStockProducto(
  producto: Pick<
    Producto,
    | "variantes"
    | "stockTotal"
    | "stockReservadoTotal"
    | "stockDisponible"
  >
) {
  const tieneVariantes = producto.variantes.length > 0;
  const fisico = tieneVariantes
    ? producto.variantes.reduce(
        (total, variante) => total + getStockFisicoVariante(variante),
        0
      )
    : nonNegative(producto.stockTotal);
  const reservado = tieneVariantes
    ? producto.variantes.reduce(
        (total, variante) => total + getStockReservadoVariante(variante),
        0
      )
    : nonNegative(producto.stockReservadoTotal);
  const disponible = tieneVariantes
    ? producto.variantes.reduce(
        (total, variante) => total + getStockDisponibleVariante(variante),
        0
      )
    : producto.stockDisponible !== undefined
      ? nonNegative(producto.stockDisponible)
      : Math.max(fisico - reservado, 0);

  return { fisico, reservado, disponible };
}

export function getEstadoStock(
  stockDisponible: number,
  stockMinimo: number | null | undefined
): EstadoStock {
  const disponible = nonNegative(stockDisponible);
  const minimo = nonNegative(stockMinimo ?? 5);

  if (disponible === 0) return "SIN_STOCK";
  if (disponible <= minimo) return "BAJO_STOCK";
  return "EN_STOCK";
}

export const ESTADO_STOCK_LABELS: Record<EstadoStock, string> = {
  EN_STOCK: "En stock",
  BAJO_STOCK: "Bajo stock",
  SIN_STOCK: "Sin stock",
};
