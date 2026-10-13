"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ComprasTable from "@/components/inventario/ComprasTable";
import { getCompras } from "@/services/compras.service";
import type { Compra } from "@/types/compra";

export default function AdminComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompras = async () => {
    try {
      setLoading(true);
      setCompras(await getCompras());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompras();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reabastecimiento de Mercadería</h1>
          <p className="text-sm text-gray-400">
            Historial de compras y actualización automática del Costo Promedio Ponderado (CPP).
          </p>
        </div>
        <Link
          href="/dashboard/admin/inventario/compras/nueva"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 transition"
        >
          <span>+</span>
          <span>Nueva Compra</span>
        </Link>
      </div>

      <ComprasTable compras={compras} loading={loading} onRefresh={loadCompras} />
    </div>
  );
}
