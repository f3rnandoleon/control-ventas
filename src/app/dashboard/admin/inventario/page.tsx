"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInventario, getProductosInventario } from "@/services/inventario.service";
import InventarioResumen from "@/components/inventario/InventarioResumen";
import InventarioTable from "@/components/inventario/InventarioTable";
import StockDisponibleTable from "@/components/inventario/StockDisponibleTable";
import StockPorProductoChart from "@/components/inventario/StockPorProductoChart";
import type { InventarioItem, ProductoInventario } from "@/types/inventario";

type InventarioVista = "resumen" | "stock" | "movimientos";

const VISTAS: { key: InventarioVista; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "stock", label: "Stock actual" },
  { key: "movimientos", label: "Movimientos" },
];

export default function AdminInventarioPage() {
  const router = useRouter();
  const [vista, setVista] = useState<InventarioVista>("resumen");
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoInventario[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vistaParam = params.get("vista");
    setVista(vistaParam === "stock" || vistaParam === "movimientos" ? vistaParam : "resumen");
  }, []);

  const changeVista = (nextVista: InventarioVista) => {
    setVista(nextVista);
    router.push(`/dashboard/admin/inventario?vista=${nextVista}`);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [productosInventario, movimientos] = await Promise.all([
          getProductosInventario(),
          getInventario(),
        ]);
        setProductos(productosInventario);
        setItems(movimientos);
      } finally {
        setLoading(false);
      }
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-sm text-gray-400">Revisa resumen, stock disponible e historial de movimientos por separado.</p>
        </div>
        <div className="flex flex-wrap rounded-xl border border-white/10 bg-white/5 p-1">
          {VISTAS.map((item) => (
            <button
              key={item.key}
              onClick={() => changeVista(item.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${vista === item.key ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-white/10"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {vista === "resumen" && (
        <section className="space-y-6">
          <InventarioResumen items={items} />
          <StockPorProductoChart data={stockData} />
        </section>
      )}

      {vista === "stock" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Stock actual</h2>
            <p className="text-sm text-gray-400">Disponibilidad por producto, variante, color y talla.</p>
          </div>
          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ) : (
            <StockDisponibleTable productos={productos} />
          )}
        </section>
      )}

      {vista === "movimientos" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Historial de movimientos</h2>
            <p className="text-sm text-gray-400">Entradas, salidas y ajustes registrados en inventario.</p>
          </div>
          <InventarioTable items={items} loading={loading} />
        </section>
      )}
    </div>
  );
}
