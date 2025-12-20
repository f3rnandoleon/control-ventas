"use client";

import { useEffect, useState } from "react";
import { getInventario } from "@/services/inventario.service";
import { InventarioItem } from "@/types/inventario";
import InventarioTable from "@/components/inventario/InventarioTable";
import InventarioResumen from "@/components/inventario/InventarioResumen";
import StockPorProductoChart from "@/components/inventario/StockPorProductoChart";
import { getProductos } from "@/services/producto.service";

export default function AdminInventarioPage() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<any[]>([]);

  const load = async () => {
    
    setLoading(true);
    setProductos(await getProductos());
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
      <StockPorProductoChart data={stockData} />

      <InventarioResumen items={items} />

      <InventarioTable items={items} loading={loading} />
    </div>
  );
}
