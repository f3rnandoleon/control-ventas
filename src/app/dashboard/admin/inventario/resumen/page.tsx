"use client";

import { useEffect, useState } from "react";
import InventarioResumen from "@/components/inventario/InventarioResumen";
import StockPorProductoChart from "@/components/inventario/StockPorProductoChart";
import { getInventario, getProductosInventario } from "@/services/inventario.service";
import type { InventarioItem, ProductoInventario } from "@/types/inventario";

export default function AdminInventarioResumenPage() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [productos, setProductos] = useState<ProductoInventario[]>([]);

  useEffect(() => {
    const load = async () => {
      const [productosInventario, movimientos] = await Promise.all([
        getProductosInventario(),
        getInventario(),
      ]);
      setProductos(productosInventario);
      setItems(movimientos);
    };

    load();
  }, []);

  const stockData = productos.map((p) => ({
    nombre: p.nombre,
    stockTotal: p.stockTotal,
    stockMinimo: p.stockMinimo,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resumen de inventario</h1>
        <p className="text-sm text-gray-400">Indicadores y graficas generales del inventario.</p>
      </div>
      <InventarioResumen items={items} />
      <StockPorProductoChart data={stockData} />
    </div>
  );
}
