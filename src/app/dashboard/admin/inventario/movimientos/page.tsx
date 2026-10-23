"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Historial de movimientos</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">Entradas, salidas y ajustes registrados en inventario y Kardex.</p>
        </div>
        <Link
          href="/dashboard/admin/inventario/stock"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 w-fit"
        >
          <span>⚖️</span> Ajustar Stock Físico
        </Link>
      </div>
      <InventarioTable items={items} loading={loading} />
    </div>
  );
}
