"use client";

import { useState, useMemo } from "react";
import type { KardexConsolidadoResumen } from "@/types/inventario";
import { formatMoney } from "@/utils/pricing";
import KardexIndividualModal from "./KardexIndividualModal";

export default function KardexConsolidadoView({
  data,
  loading,
}: {
  data: KardexConsolidadoResumen | null;
  loading: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("TODAS");
  const [selectedProductoId, setSelectedProductoId] = useState<string | null>(null);
  const [expandedProductoId, setExpandedProductoId] = useState<string | null>(null);

  // Categorías únicas
  const categorias = useMemo(() => {
    if (!data) return [];
    const cats = new Set(data.productos.map((p) => p.categoria || "Sin categoría"));
    return ["TODAS", ...Array.from(cats)];
  }, [data]);

  // Filtrado
  const productosFiltrados = useMemo(() => {
    if (!data) return [];
    const query = searchTerm.trim().toLowerCase();

    return data.productos.filter((p) => {
      if (categoriaFiltro !== "TODAS" && (p.categoria || "Sin categoría") !== categoriaFiltro) {
        return false;
      }

      if (!query) return true;

      const fullText = [p.nombre, p.modelo, p.sku, p.categoria || ""]
        .join(" ")
        .toLowerCase();
      return fullText.includes(query);
    });
  }, [data, searchTerm, categoriaFiltro]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-gray-400 border border-white/10 rounded-2xl bg-white/5">
        No se pudieron cargar las tarjetas valoradas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. TARJETAS MÉTRICAS DE CAPITAL INVERTIDO Y VALOR DE MERCANCÍA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capital invertido al costo */}
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-slate-900/60 p-5 shadow-[0_0_15px_rgba(0,180,255,0.08)]">
          <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider block">
            Capital Invertido (Costo)
          </span>
          <p className="text-2xl font-black text-cyan-400 mt-2">
            {formatMoney(data.capitalTotalInvertidoCosto)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Valoración total del almacén por CPP
          </p>
        </div>

        {/* Valor de venta potencial */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 p-5 shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
            Valor Potencial de Venta
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            {formatMoney(data.valorTotalPotencialVenta)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Si se vende todo el stock al precio actual
          </p>
        </div>

        {/* Margen bruto proyectado */}
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-slate-900/60 p-5 shadow-[0_0_15px_rgba(168,85,247,0.08)]">
          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider block">
            Margen Bruto Proyectado
          </span>
          <p className="text-2xl font-black text-purple-300 mt-2">
            {data.margenBrutoGlobalPorcentaje}%
          </p>
          <p className="text-[11px] text-purple-200/70 mt-1">
            Ganancia estimada: {formatMoney(data.margenBrutoGlobalMonto)}
          </p>
        </div>

        {/* Total prendas físicas */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Prendas Físicas Totales
          </span>
          <p className="text-2xl font-black text-white mt-2">
            {data.totalPrendasFisicas} <span className="text-sm font-normal text-gray-400">u.</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            En {data.totalProductos} modelos y {data.totalVariantes} variantes
          </p>
        </div>
      </div>

      {/* 2. FILTROS Y CONTROLES */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar por nombre, modelo, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />

          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="rounded-xl bg-gray-900 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "TODAS" ? "Todas las categorías" : cat}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition whitespace-nowrap"
        >
          🖨️ Imprimir Consolidado
        </button>
      </div>

      {/* 3. TABLA CONSOLIDADA DE VALUACIÓN POR PRODUCTO */}
      <div className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_20px_rgba(0,180,255,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-gray-300">
            <thead className="bg-white/5 border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Producto / Modelo</th>
                <th className="px-4 py-3.5 text-left">SKU & Cat.</th>
                <th className="px-4 py-3.5 text-center">Stock Físico</th>
                <th className="px-4 py-3.5 text-right">Costo Prom. (CPP)</th>
                <th className="px-4 py-3.5 text-right">Precio Venta</th>
                <th className="px-4 py-3.5 text-right text-cyan-300">Valor Costo (Bs)</th>
                <th className="px-4 py-3.5 text-right text-emerald-300">Valor Venta (Bs)</th>
                <th className="px-4 py-3.5 text-center">Margen</th>
                <th className="px-4 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {productosFiltrados.map((prod) => {
                const isExpanded = expandedProductoId === prod.productoId;

                return (
                  <tr key={prod.productoId} className="group hover:bg-white/[0.03] transition-colors">
                    {/* Nombre y Modelo */}
                    <td className="px-5 py-4 font-medium text-white">
                      <div className="text-sm font-bold text-gray-100">{prod.nombre}</div>
                      {prod.modelo && (
                        <div className="text-[11px] text-cyan-400">
                          Modelo: {prod.modelo}
                        </div>
                      )}
                    </td>

                    {/* SKU y Categoría */}
                    <td className="px-4 py-4">
                      <div className="font-mono text-gray-300">{prod.sku}</div>
                      <div className="text-[10px] text-gray-500">
                        {prod.categoria || "General"}
                      </div>
                    </td>

                    {/* Stock Físico */}
                    <td className="px-4 py-4 text-center">
                      <span className="font-bold text-sm text-white">
                        {prod.stockTotal} u.
                      </span>
                    </td>

                    {/* Costo Promedio CPP */}
                    <td className="px-4 py-4 text-right font-mono font-semibold text-cyan-300">
                      {formatMoney(prod.costoPromedioPonderado)}
                    </td>

                    {/* Precio Venta Promedio */}
                    <td className="px-4 py-4 text-right font-mono font-medium text-gray-200">
                      {formatMoney(prod.precioVentaPromedio)}
                    </td>

                    {/* Total Valorado en Costo */}
                    <td className="px-4 py-4 text-right font-mono font-bold text-cyan-400">
                      {formatMoney(prod.valorTotalInventarioCosto)}
                    </td>

                    {/* Total Valorado en Venta */}
                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-400">
                      {formatMoney(prod.valorTotalInventarioVenta)}
                    </td>

                    {/* Margen */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {prod.margenBrutoEstimadoPorcentaje}%
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-4 text-center space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedProductoId(prod.productoId)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition"
                        title="Ver movimientos y tarjeta individual"
                      >
                        📄 Kardex
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedProductoId(isExpanded ? null : prod.productoId)
                        }
                        className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs transition"
                        title="Ver desglose por tallas/colores"
                      >
                        {isExpanded ? "▲" : "▼ Tallas"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE KARDEX INDIVIDUAL */}
      {selectedProductoId && (
        <KardexIndividualModal
          productoId={selectedProductoId}
          onClose={() => setSelectedProductoId(null)}
        />
      )}
    </div>
  );
}
