"use client";

import { useEffect, useState } from "react";
import StockDisponibleTable from "@/components/inventario/StockDisponibleTable";
import { getProductosInventario } from "@/services/inventario.service";
import type { ProductoInventario } from "@/types/inventario";

export default function VendedorInventarioStockPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setProductos(await getProductosInventario());
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock actual</h1>
        <p className="text-sm text-gray-400">Vista rapida del stock actual por variante para apoyar la venta.</p>
      </div>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por producto, color o talla..."
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40"
      />
      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      ) : (
        <StockDisponibleTable productos={productos} searchTerm={search} />
      )}
    </div>
  );
}
