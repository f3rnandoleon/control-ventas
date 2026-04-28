import type { Variante } from "@/types/producto";

type VariantStockShape = {
  stock?: number | null;
  stockReservado?: number | null;
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

export const withComputedStock = <T extends { stockTotal?: number; stockMinimo?: number; variantes?: Array<{ stock?: number | null }> }>(
  producto: T
) => ({
  ...producto,
  stockTotal:
    (producto.variantes && producto.variantes.length > 0)
      ? producto.variantes.reduce(
          (total, variante) => total + (variante.stock || 0),
          0
        )
      : (producto.stockTotal || 0),
  stockMinimo: producto.stockMinimo ?? 5,
});
