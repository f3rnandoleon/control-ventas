"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import VentaDetalleModal from "@/components/ventas/VentaDetalleModal";
import VentaTable from "@/components/ventas/VentaTable";
import { getMisVentas } from "@/services/pedidos.service";
import type { Pedido } from "@/types/pedido";

export default function VendedorHistorialVentasPage() {
  const [ventas, setVentas] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [metodoFiltro, setMetodoFiltro] = useState<string>("TODOS");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Pedido | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    getMisVentas()
      .then(setVentas)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "No se pudo cargar tu historial de ventas")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrado local reactivo para el vendedor
  const ventasFiltradas = useMemo(() => {
    let list = ventas;

    if (metodoFiltro !== "TODOS") {
      list = list.filter((v) => v.metodoPago === metodoFiltro);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((v) => {
        const cliente =
          v.snapshotCliente?.nombreCompleto || v.cliente?.nombreCompleto || "";
        const itemsText = (v.items || [])
          .map(
            (it) =>
              `${it.productoSnapshot?.nombre || ""} ${it.productoSnapshot?.modelo || ""} ${it.variante?.color || ""} ${it.variante?.talla || ""}`
          )
          .join(" ");

        const all = `${v.numeroPedido} ${cliente} ${itemsText}`.toLowerCase();
        return all.includes(query);
      });
    }

    return list;
  }, [ventas, metodoFiltro, search]);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [search, metodoFiltro]);

  // Métricas KPI del vendedor
  const kpis = useMemo(() => {
    let totalMonto = 0;
    let totalPrendas = 0;
    let totalEfectivo = 0;
    let totalQR = 0;

    for (const v of ventasFiltradas) {
      totalMonto += v.total || 0;
      if (v.metodoPago === "EFECTIVO") totalEfectivo += v.total || 0;
      if (v.metodoPago === "QR") totalQR += v.total || 0;
      for (const it of v.items || []) {
        totalPrendas += it.cantidad || 1;
      }
    }

    return { totalMonto, totalPrendas, totalEfectivo, totalQR };
  }, [ventasFiltradas]);

  const totalPages = Math.max(1, Math.ceil(ventasFiltradas.length / pageSize));
  const ventasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize;
    return ventasFiltradas.slice(start, start + pageSize);
  }, [ventasFiltradas, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Cabecera y Título */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Mis Ventas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Revisa el historial de tus ventas realizadas con detalle de prendas, modelos y cobros.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
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
            💰 Total Vendido
          </span>
          <p className="text-lg sm:text-2xl font-extrabold text-sky-700 dark:text-cyan-400 mt-1">
            Bs {kpis.totalMonto.toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {ventasFiltradas.length} ventas
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
            Total de unidades
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
            Efectivo cobrado
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
            Cobros por QR
          </span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtro Rápido */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, N° pedido, prenda o modelo..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 pl-9 pr-8 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMetodoFiltro("TODOS")}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
                metodoFiltro === "TODOS"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setMetodoFiltro(metodoFiltro === "EFECTIVO" ? "TODOS" : "EFECTIVO")}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
                metodoFiltro === "EFECTIVO"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
              }`}
            >
              <span>💵</span>
              <span>Efectivo</span>
            </button>
            <button
              type="button"
              onClick={() => setMetodoFiltro(metodoFiltro === "QR" ? "TODOS" : "QR")}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
                metodoFiltro === "QR"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
              }`}
            >
              <span>📱</span>
              <span>QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla y Tarjetas de Ventas */}
      <VentaTable
        ventas={ventasPaginadas}
        onVerDetalle={setVentaSeleccionada}
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={ventasFiltradas.length}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {/* Modal de Detalle */}
      <VentaDetalleModal
        Pedido={ventaSeleccionada}
        onClose={() => setVentaSeleccionada(null)}
        onUpdated={loadData}
      />
    </div>
  );
}
