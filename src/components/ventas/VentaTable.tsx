"use client";

import { useState } from "react";
import type { Pedido } from "@/types/pedido";
import Pagination from "@/components/ui/Pagination";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import ColorSwatch from "@/components/ui/ColorSwatch";
import VentaCard from "./VentaCard";

export default function VentaTable({
  ventas,
  onVerDetalle,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  loading,
  onPageChange,
  onPageSizeChange,
}: {
  ventas: Pedido[];
  onVerDetalle: (pedido: Pedido) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  // Estado para expandir items de filas individuales en la tabla desktop
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const canalConfig: Record<string, { label: string; icon: string; className: string }> = {
    TIENDA: {
      label: "Tienda",
      icon: "🏬",
      className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30",
    },
    WEB: {
      label: "Web",
      icon: "🌐",
      className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/30",
    },
    WHATSAPP: {
      label: "WhatsApp",
      icon: "💬",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30",
    },
    APP_QR: {
      label: "App QR",
      icon: "📱",
      className: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-500/30",
    },
  };

  return (
    <div className="space-y-4">
      {/* VISTA MÓVIL: Tarjetas VentaCard (md:hidden) */}
      <div className="space-y-3.5 md:hidden">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5"
              />
            ))}
          </div>
        )}

        {!loading &&
          ventas.map((venta) => (
            <VentaCard
              key={venta._id}
              venta={venta}
              onVerDetalle={onVerDetalle}
            />
          ))}

        {!loading && ventas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-8 text-center text-slate-500 dark:text-gray-400 space-y-2">
            <span className="text-3xl">🛒</span>
            <p className="font-semibold text-sm">No hay ventas registradas</p>
            <p className="text-xs">No se encontraron ventas que coincidan con los filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* VISTA ESCRITORIO / WEB: Tabla Enriquecida con Imágenes y Modelos (hidden md:block) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-gray-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha / Canal</th>
                <th className="py-3 px-3">N° Pedido</th>
                <th className="py-3 px-4 min-w-[280px]">Prendas & Modelos</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Vendedor</th>
                <th className="py-3 px-3 text-center">Método</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sky-600 dark:text-cyan-400 font-medium">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Cargando ventas...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                ventas.map((venta) => {
                  const items = venta.items || [];
                  const isExpanded = Boolean(expandedRows[venta._id]);
                  const visibleItems = isExpanded ? items : items.slice(0, 1);
                  const hasMoreItems = items.length > 1;

                  const canal = canalConfig[venta.canal] || {
                    label: venta.canal || "Venta",
                    icon: "🛒",
                    className: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-gray-300",
                  };

                  const fechaObj = new Date(venta.createdAt);
                  const fechaStr = isNaN(fechaObj.getTime())
                    ? venta.createdAt
                    : fechaObj.toLocaleDateString("es-BO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                  const clienteNombre =
                    venta.snapshotCliente?.nombreCompleto ||
                    venta.cliente?.nombreCompleto ||
                    "Venta mostrador";

                  const vendedorNombre =
                    venta.vendedor?.nombreCompleto || "Sin vendedor";

                  return (
                    <tr
                      key={venta._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Fecha y Canal */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {fechaStr}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${canal.className}`}
                        >
                          <span>{canal.icon}</span>
                          <span>{canal.label}</span>
                        </span>
                      </td>

                      {/* N° Pedido */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          #{venta.numeroPedido}
                        </span>
                      </td>

                      {/* Prendas, Imágenes y Modelos */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          {visibleItems.map((it, idx) => {
                            const img = it.productoSnapshot?.imagen;
                            const modelo = it.productoSnapshot?.modelo;
                            const nombre = it.productoSnapshot?.nombre || "Prenda";
                            const color = it.variante?.color || "";
                            const talla = it.variante?.talla || "";

                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-black/20 p-1.5"
                              >
                                {/* Miniatura */}
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40">
                                  {img ? (
                                    <CloudinaryImage
                                      src={img}
                                      alt={nombre}
                                      width={40}
                                      height={40}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                                      👕
                                    </div>
                                  )}
                                  {it.cantidad > 1 && (
                                    <span className="absolute -right-1 -top-1 rounded-full bg-cyan-500 px-1 py-0.2 text-[8px] font-bold text-black">
                                      x{it.cantidad}
                                    </span>
                                  )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white truncate">
                                      {nombre}
                                    </span>
                                    {modelo && (
                                      <span className="rounded bg-sky-100 text-sky-800 dark:bg-cyan-950/60 dark:text-cyan-300 px-1.5 py-0.2 text-[9px] font-semibold font-mono shrink-0">
                                        Mod: {modelo}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                                    {color && (
                                      <div className="flex items-center gap-1">
                                        <ColorSwatch colorName={color} size="xs" />
                                        <span className="capitalize">{color}</span>
                                      </div>
                                    )}
                                    {talla && <span className="font-bold font-mono">T.{talla}</span>}
                                    <span>
                                      ({it.cantidad} u. x Bs {it.precioUnitario})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Toggle ver más prendas */}
                          {hasMoreItems && (
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(venta._id)}
                              className="text-[10px] font-bold text-sky-600 dark:text-cyan-400 hover:underline cursor-pointer"
                            >
                              {isExpanded
                                ? "▲ Ocultar prendas"
                                : `▼ +${items.length - 1} prenda(s) más en este pedido`}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-gray-200">
                          {clienteNombre}
                        </div>
                        {venta.snapshotCliente?.telefono && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            📞 {venta.snapshotCliente.telefono}
                          </div>
                        )}
                      </td>

                      {/* Vendedor */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-gray-300">
                          <span>🏷️</span>
                          <span>{vendedorNombre}</span>
                        </span>
                      </td>

                      {/* Método de Pago */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                            venta.metodoPago === "EFECTIVO"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30"
                          }`}
                        >
                          <span>{venta.metodoPago === "EFECTIVO" ? "💵" : "📱"}</span>
                          <span>{venta.metodoPago}</span>
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="font-extrabold text-sky-700 dark:text-cyan-400 text-sm">
                          Bs {Number(venta.total).toFixed(2)}
                        </span>
                        {venta.descuento > 0 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            -Bs {Number(venta.descuento).toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onVerDetalle(venta)}
                          className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-bold transition active:scale-95 cursor-pointer shadow-sm"
                        >
                          👁️ Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!loading && ventas.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No hay ventas que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        totalItems={totalItems}
        disabled={loading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
