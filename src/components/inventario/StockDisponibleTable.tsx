"use client";

import type { ProductoInventario } from "@/types/inventario";
import StockJerarquicoView from "./StockJerarquicoView";

export default function StockDisponibleTable({
  productos,
  searchTerm = "",
  onStockUpdated,
}: {
  productos: ProductoInventario[];
  searchTerm?: string;
  onStockUpdated?: () => void;
}) {
  return (
    <StockJerarquicoView
      productos={productos}
      searchTerm={searchTerm}
      onStockUpdated={onStockUpdated}
    />
  );
}
