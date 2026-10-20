"use client";

import { Suspense } from "react";
import Link from "next/link";
import NuevaCompraForm from "@/components/inventario/NuevaCompraForm";

export default function NuevaCompraPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link
              href="/dashboard/admin/inventario/compras"
              className="hover:text-cyan-400 transition"
            >
              Compras
            </Link>
            <span>/</span>
            <span className="text-gray-200">Nueva Compra</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Registrar Compra / Reabastecimiento
          </h1>
          <p className="text-sm text-gray-400">
            Ingresa las prendas compradas. El sistema recalculará el Costo Promedio Ponderado (CPP) automáticamente.
          </p>
        </div>

        <Link
          href="/dashboard/admin/inventario/compras"
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-sm font-semibold transition"
        >
          Volver a Compras
        </Link>
      </div>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5" />}>
        <NuevaCompraForm />
      </Suspense>
    </div>
  );
}
