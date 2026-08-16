"use client";

import { useEffect, useState } from "react";
import InventarioTable from "@/components/inventario/InventarioTable";
import { getInventario } from "@/services/inventario.service";
import type { InventarioItem } from "@/types/inventario";

export default function AdminInventarioMovimientosPage() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setItems(await getInventario());
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de movimientos</h1>
        <p className="text-sm text-gray-400">Entradas, salidas y ajustes registrados en inventario.</p>
      </div>
      <InventarioTable items={items} loading={loading} />
    </div>
  );
}
