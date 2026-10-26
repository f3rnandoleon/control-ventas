"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import VentaDetalleModal from "@/components/ventas/VentaDetalleModal";
import VentaFilters, {
  EMPTY_VENTA_FILTERS,
  type VentaFilterValues,
} from "@/components/ventas/VentaFilters";
import VentaTable from "@/components/ventas/VentaTable";
import { getVentasPage, type PaginatedSalesResponse } from "@/services/pedidos.service";
import type { Pedido } from "@/types/pedido";

const EMPTY_PAGE: PaginatedSalesResponse = {
  items: [],
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
};

export default function AdminHistorialVentasPage() {
  const [result, setResult] = useState(EMPTY_PAGE);
  const [filters, setFilters] = useState<VentaFilterValues>(EMPTY_VENTA_FILTERS);
  const [debouncedText, setDebouncedText] = useState({ customer: "", seller: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Pedido | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText({ customer: filters.customer.trim(), seller: filters.seller.trim() });
    }, 350);

    return () => clearTimeout(timer);
  }, [filters.customer, filters.seller]);

  useEffect(() => {
    setPage(1);
  }, [filters.from, filters.to, filters.paymentMethod, debouncedText]);

  const fetchVentas = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    getVentasPage(
      {
        page,
        limit: pageSize,
        from: filters.from || undefined,
        to: filters.to || undefined,
        customer: debouncedText.customer || undefined,
        seller: debouncedText.seller || undefined,
        paymentMethod: filters.paymentMethod || undefined,
      },
      controller.signal
    )
      .then(setResult)
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") toast.error(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, pageSize, filters.from, filters.to, filters.paymentMethod, debouncedText]);

  useEffect(() => {
    return fetchVentas();
  }, [fetchVentas, refreshTrigger]);

  // Métricas KPI de la página
  const kpis = useMemo(() => {
    let totalMonto = 0;
    let totalPrendas = 0;
    let totalEfectivo = 0;
    let totalQR = 0;

    for (const v of result.items) {
      totalMonto += v.total || 0;
      if (v.metodoPago === "EFECTIVO") totalEfectivo += v.total || 0;
      if (v.metodoPago === "QR") totalQR += v.total || 0;
      for (const it of v.items || []) {
        totalPrendas += it.cantidad || 1;
      }
    }

    return { totalMonto, totalPrendas, totalEfectivo, totalQR };
  }, [result.items]);

  return (
    <div className="space-y-6">
      {/* Cabecera y Título */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Historial de Ventas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Explora las ventas registradas con detalle fotográfico de prendas, modelos y métodos de cobro.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshTrigger((prev) => prev + 1)}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer"
        >
          <span>🔄</span>
          <span>Actualizar</span>
        </button>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 font-bold uppercase block">
            💰 Ventas en Página
          </span>
          <p className="text-lg sm:text-2xl font-extrabold text-sky-700 dark:text-cyan-400 mt-1">
            Bs {kpis.totalMonto.toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {result.total} ventas en total
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 font-bold uppercase block">
            👕 Prendas Vendidas
          </span>
          <p className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {kpis.totalPrendas} u.
          </p>
          <span className="text-[10px] text-slate-400">
            En los pedidos mostrados
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 p-4 shadow-sm">
          <span className="text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase block">
            💵 Efectivo
          </span>
          <p className="text-lg sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
            Bs {kpis.totalEfectivo.toFixed(2)}
          </p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80 font-mono">
            Cobro en mostrador
          </span>
        </div>

        <div className="rounded-2xl border border-cyan-200 dark:border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-500/10 p-4 shadow-sm">
          <span className="text-[10px] sm:text-xs text-cyan-800 dark:text-cyan-300 font-bold uppercase block">
            📱 Pagos con QR
          </span>
          <p className="text-lg sm:text-2xl font-extrabold text-cyan-700 dark:text-cyan-400 mt-1">
            Bs {kpis.totalQR.toFixed(2)}
          </p>
          <span className="text-[10px] text-cyan-600/80 dark:text-cyan-300/80 font-mono">
            Transferencias QR
          </span>
        </div>
      </div>

      {/* Filtros */}
      <VentaFilters value={filters} onChange={setFilters} />

      {/* Tabla y Tarjetas de Ventas */}
      <VentaTable
        ventas={result.items}
        onVerDetalle={setVentaSeleccionada}
        currentPage={page}
        totalPages={result.totalPages}
        pageSize={pageSize}
        totalItems={result.total}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {/* Modal Detallado con Fotos y Modelos */}
      <VentaDetalleModal
        Pedido={ventaSeleccionada}
        onClose={() => setVentaSeleccionada(null)}
        onUpdated={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
}
