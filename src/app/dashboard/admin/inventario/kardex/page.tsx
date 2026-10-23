"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import KardexConsolidadoView from "@/components/inventario/KardexConsolidadoView";
import { getKardexConsolidado } from "@/services/kardex.service";
import type { KardexConsolidadoResumen } from "@/types/inventario";

function AdminKardexContent() {
  const searchParams = useSearchParams();
  const initialProductoId = searchParams.get("productoId") || undefined;
  const initialVarianteId = searchParams.get("varianteId") || undefined;

  const [data, setData] = useState<KardexConsolidadoResumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getKardexConsolidado();
        setData(res);
      } catch (err) {
        console.error("Error al cargar kardex consolidado:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tarjetas Valoradas de Inventario</h1>
          <p className="text-sm text-gray-400">
            Valuación del inventario mediante Costo Promedio Ponderado (CPP), capital invertido y márgenes de ganancia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/inventario/compras"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition"
          >
            📦 Ver Compras
          </Link>
          <Link
            href="/dashboard/admin/inventario/compras/nueva"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md transition"
          >
            + Nueva Compra
          </Link>
        </div>
      </div>

      <KardexConsolidadoView
        data={data}
        loading={loading}
        initialProductoId={initialProductoId}
        initialVarianteId={initialVarianteId}
      />
    </div>
  );
}

export default function AdminKardexPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-400">
          Cargando módulo de kardex...
        </div>
      }
    >
      <AdminKardexContent />
    </Suspense>
  );
}
