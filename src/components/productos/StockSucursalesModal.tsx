"use client";

import { useEffect, useState, useMemo } from "react";
import type { Producto, Variante } from "@/types/producto";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import { toast } from "sonner";

interface SucursalPopulated {
  _id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  activa: boolean;
  permiteVentaPOS?: boolean;
}

interface NivelStockResponse {
  _id: string;
  sucursalId: SucursalPopulated | string;
  productoId: string;
  varianteId: string;
  stockFisico: number;
  stockReservado: number;
  stockMinimo: number;
}

interface StockSucursalesModalProps {
  producto: Producto | null;
  open: boolean;
  onClose: () => void;
}

export default function StockSucursalesModal({
  producto,
  open,
  onClose,
}: StockSucursalesModalProps) {
  const [loading, setLoading] = useState(false);
  const [niveles, setNiveles] = useState<NivelStockResponse[]>([]);
  const [selectedSucursalFilter, setSelectedSucursalFilter] = useState<string>("ALL");
  const [searchVariante, setSearchVariante] = useState("");

  useEffect(() => {
    if (!open || !producto) {
      setNiveles([]);
      return;
    }

    const fetchStockSucursales = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/productos/${producto._id}/stock-sucursales`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Error al obtener stock por sucursal");
        }
        const data = await res.json();
        setNiveles(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar el stock");
      } finally {
        setLoading(false);
      }
    };

    void fetchStockSucursales();
  }, [open, producto]);

  // Lista única de sucursales encontradas en los niveles de stock
  const sucursales = useMemo(() => {
    const map = new Map<string, SucursalPopulated>();
    niveles.forEach((n) => {
      if (typeof n.sucursalId === "object" && n.sucursalId?._id) {
        map.set(n.sucursalId._id, n.sucursalId);
      }
    });
    return Array.from(map.values());
  }, [niveles]);

  // Totales globales
  const kpis = useMemo(() => {
    let fisico = 0;
    let reservado = 0;
    niveles.forEach((n) => {
      fisico += Number(n.stockFisico || 0);
      reservado += Number(n.stockReservado || 0);
    });
    return {
      fisico,
      reservado,
      disponible: Math.max(0, fisico - reservado),
    };
  }, [niveles]);

  if (!open || !producto) return null;

  // Filtrado de variantes
  const filteredVariantes = producto.variantes.filter((v: Variante) => {
    const text = `${v.color} ${v.colorSecundario || ""} ${v.talla} ${v.codigoBarra || ""}`.toLowerCase();
    return text.includes(searchVariante.toLowerCase().trim());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-sm p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl h-[94dvh] sm:h-[88vh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 shadow-2xl shadow-sky-950/20 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Encabezado fijo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 shrink-0 gap-3">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">🏬</span>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-wide">
                Desglose de Stock por Tienda / Almacén
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-sky-600 dark:text-sky-400 font-medium">
              {producto.nombre} <span className="text-slate-500 dark:text-gray-400">({producto.modelo || "Sin modelo"})</span> — SKU: {producto.sku}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white transition active:scale-95 cursor-pointer"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* CUERPO DEL MODAL (ÚNICO SCROLL FLUIDO PARA MÓVIL Y DESKTOP) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
          
          {/* KPIs Resumen con alto contraste en modo claro y oscuro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10 p-4 transition-colors">
              <span className="text-xs uppercase tracking-wider text-sky-700 dark:text-sky-400 font-bold block">
                Stock Físico Total
              </span>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {kpis.fisico} <span className="text-xs font-normal text-sky-700 dark:text-sky-300">unidades</span>
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10 p-4 transition-colors">
              <span className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold block">
                Stock Reservado
              </span>
              <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-300">
                {kpis.reservado} <span className="text-xs font-normal text-amber-700 dark:text-amber-200">en carritos / pedidos</span>
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-4 transition-colors">
              <span className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold block">
                Stock Disponible Total
              </span>
              <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {kpis.disponible} <span className="text-xs font-normal text-emerald-700 dark:text-emerald-200">listas para venta</span>
              </p>
            </div>
          </div>

          {/* Filtros locales (buscador y selector de sucursal) */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            <div className="w-full sm:flex-1">
              <input
                type="text"
                placeholder="Buscar variante por color, talla o código..."
                value={searchVariante}
                onChange={(e) => setSearchVariante(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition"
              />
            </div>
            <div className="w-full sm:w-auto">
              <select
                value={selectedSucursalFilter}
                onChange={(e) => setSelectedSucursalFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-white focus:border-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Todas las sucursales ({sucursales.length})</option>
                {sucursales.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.nombre} ({s.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contenido / Listado de variantes */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 dark:text-gray-400">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
              <p className="mt-2 text-sm">Consultando inventario por sucursal...</p>
            </div>
          ) : filteredVariantes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
              No se encontraron variantes que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVariantes.map((variante) => {
                const img = getVarianteImagenPrincipal(variante);

                // Filtrar niveles de stock para esta variante
                const varianteNiveles = niveles.filter(
                  (n) => n.varianteId === variante.varianteId
                );

                // Si hay filtro de sucursal
                const displayNiveles = selectedSucursalFilter === "ALL"
                  ? varianteNiveles
                  : varianteNiveles.filter(
                      (n) => typeof n.sucursalId === "object" && n.sucursalId?._id === selectedSucursalFilter
                    );

                const subtotalFisico = displayNiveles.reduce((acc, curr) => acc + (curr.stockFisico || 0), 0);
                const subtotalReservado = displayNiveles.reduce((acc, curr) => acc + (curr.stockReservado || 0), 0);
                const subtotalDisp = Math.max(0, subtotalFisico - subtotalReservado);

                return (
                  <div
                    key={variante.varianteId}
                    className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-4 hover:border-sky-300 dark:hover:border-sky-500/30 transition shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5 gap-3">
                      <div className="flex items-center gap-3">
                        {img ? (
                          <CloudinaryImage
                            src={img}
                            alt={variante.color}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-white/10 bg-white"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-gray-400 text-xs border border-slate-200 dark:border-white/10">
                            Sin foto
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                              {variante.color} {variante.colorSecundario ? `/ ${variante.colorSecundario}` : ""}
                            </span>
                            <span className="rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 px-2 py-0.5 text-xs font-bold font-mono">
                              Talla {variante.talla}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                            ID: {variante.varianteId} {variante.codigoBarra ? `• Código: ${variante.codigoBarra}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs bg-white dark:bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 self-start md:self-auto shadow-sm">
                        <span className="text-slate-500 dark:text-gray-400">Total:</span>
                        <span className="text-slate-900 dark:text-white font-bold">{subtotalFisico} Físico</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{subtotalReservado} Res.</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{subtotalDisp} Disp.</span>
                      </div>
                    </div>

                    {/* Tabla de sucursales para esta variante */}
                    <div className="mt-3 overflow-x-auto">
                      {displayNiveles.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-gray-500 italic py-2">
                          No hay registros de inventario para esta variante en la sucursal seleccionada.
                        </p>
                      ) : (
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-white/5">
                              <th className="pb-2 font-semibold">Sucursal / Almacén</th>
                              <th className="pb-2 font-semibold">Tipo</th>
                              <th className="pb-2 text-right font-semibold">Físico</th>
                              <th className="pb-2 text-right font-semibold">Reservado</th>
                              <th className="pb-2 text-right font-semibold">Disponible</th>
                              <th className="pb-2 text-center font-semibold">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {displayNiveles.map((nivel) => {
                              const sucursalObj = typeof nivel.sucursalId === "object" ? nivel.sucursalId : null;
                              const disponible = Math.max(0, (nivel.stockFisico || 0) - (nivel.stockReservado || 0));
                              const esAgotado = disponible === 0;
                              const esBajo = !esAgotado && disponible <= (nivel.stockMinimo || 2);

                              return (
                                <tr key={nivel._id} className="hover:bg-slate-100/70 dark:hover:bg-white/[0.02] transition">
                                  <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                                    {sucursalObj?.nombre || "Sucursal desconocida"}
                                    <span className="text-slate-400 dark:text-gray-500 ml-1.5 font-normal">
                                      [{sucursalObj?.codigo || "N/A"}]
                                    </span>
                                  </td>
                                  <td className="py-2.5">
                                    <span className="rounded bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-gray-300 uppercase font-semibold">
                                      {sucursalObj?.tipo || "TIENDA"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">
                                    {nivel.stockFisico}
                                  </td>
                                  <td className="py-2.5 text-right font-semibold text-amber-600 dark:text-amber-400">
                                    {nivel.stockReservado}
                                  </td>
                                  <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                    {disponible}
                                  </td>
                                  <td className="py-2.5 text-center">
                                    {esAgotado ? (
                                      <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 px-2 py-0.5 text-[10px] font-bold">
                                        Agotado
                                      </span>
                                    ) : esBajo ? (
                                      <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold">
                                        Bajo ({nivel.stockMinimo || 2})
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                                        Óptimo
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer fijo con botón "Entendido" */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-slate-900/95 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/25 hover:bg-sky-500 transition active:scale-95 cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
