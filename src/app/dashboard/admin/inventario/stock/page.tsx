"use client";

import { useEffect, useState } from "react";
import StockDisponibleTable from "@/components/inventario/StockDisponibleTable";
import { getProductosInventario } from "@/services/inventario.service";
import type { ProductoInventario } from "@/types/inventario";

export default function AdminInventarioStockPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setProductos(await getProductosInventario());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stock e Inventario por Producto</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Vista jerárquica: Producto ➔ Variantes, filtros por color/talla y análisis de costo CPP, tipo de cambio y stock por sucursal.
        </p>
      </div>
      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5" />
      ) : (
        <StockDisponibleTable productos={productos} onStockUpdated={load} />
      )}
    </div>
  );
}
