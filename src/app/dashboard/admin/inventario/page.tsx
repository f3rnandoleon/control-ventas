"use client";

import { useEffect, useState } from "react";
import { getInventario } from "@/services/inventario.service";
import { InventarioItem } from "@/types/inventario";
import InventarioTable from "@/components/inventario/InventarioTable";
import InventarioResumen from "@/components/inventario/InventarioResumen";
import StockPorProductoChart from "@/components/inventario/StockPorProductoChart";
import StockDisponibleTable from "@/components/inventario/StockDisponibleTable";
import { getProductosInventario } from "@/services/inventario.service";
import type { ProductoInventario } from "@/types/inventario";

export default function AdminInventarioPage() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [tabActiva, setTabActiva] = useState<"stock" | "movimientos">("stock");

  const load = async () => {
    setLoading(true);
    setProductos(await getProductosInventario());
    setItems(await getInventario());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stockData = productos.map((p) => ({
    nombre: p.nombre,
    stockTotal: p.stockTotal,
    stockMinimo: p.stockMinimo,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventario</h1>

      {/* Resumen con valores */}
      <InventarioResumen items={items} productos={productos} />

      {/* Gráfico de stock */}
      <StockPorProductoChart data={stockData} />

      {/* Tabs */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,180,255,0.15)]">
        {/* Tab Headers */}
        <div className="flex border-b border-white/10 bg-white/5">
          <button
            onClick={() => setTabActiva("stock")}
            className={`flex-1 px-6 py-3 font-medium transition-all ${tabActiva === "stock"
                ? "bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-500"
                : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
              }`}
          >
            📦 Stock Actual
          </button>
          <button
            onClick={() => setTabActiva("movimientos")}
            className={`flex-1 px-6 py-3 font-medium transition-all ${tabActiva === "movimientos"
                ? "bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-500"
                : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
              }`}
          >
            📋 Historial de Movimientos
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {tabActiva === "stock" ? (
            <StockDisponibleTable productos={productos} />
          ) : (
            <InventarioTable items={items} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}
