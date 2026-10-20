"use client";

import type { ProductoInventario } from "@/types/inventario";
import StockJerarquicoView from "./StockJerarquicoView";

export default function StockDisponibleTable({
  productos,
  searchTerm = "",
}: {
  productos: ProductoInventario[];
  searchTerm?: string;
}) {
  return <StockJerarquicoView productos={productos} searchTerm={searchTerm} />;
}
