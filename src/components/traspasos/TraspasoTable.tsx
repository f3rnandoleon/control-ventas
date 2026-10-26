"use client";

import type { Traspaso } from "@/types/traspaso";
import type { Sucursal } from "@/types/sucursal";
import type { Producto } from "@/types/producto";
import { formatMoney } from "@/utils/pricing";
import TraspasoStatusBadge from "./TraspasoStatusBadge";
import TraspasoThumb from "./TraspasoThumb";

interface TraspasoTableProps {
  traspasos: Traspaso[];
  productosMap?: Record<string, Producto>;
  actionLoading?: boolean;
  onView: (traspaso: Traspaso) => void;
  onDespachar?: (id: string) => void;
  onRecibir?: (traspaso: Traspaso) => void;
  onCancelar?: (id: string) => void;
  onPrint?: (traspaso: Traspaso) => void;
}

export default function TraspasoTable({
  traspasos,
  productosMap = {},
  actionLoading = false,
  onView,
  onDespachar,
  onRecibir,
  onCancelar,
  onPrint,
}: TraspasoTableProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="bg-slate-950/60 border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-4">Código / Fecha</th>
              <th className="px-5 py-4">Ruta (Origen → Destino)</th>
              <th className="px-5 py-4">Prendas & Modelos</th>
              <th className="px-5 py-4 text-right">Valor Costo (CPP)</th>
              <th className="px-5 py-4 text-center">Estado</th>
              <th className="px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {traspasos.map((t) => {
              const origen =
                typeof t.sucursalOrigenId === "object"
                  ? (t.sucursalOrigenId as unknown as Sucursal).nombre
                  : "Origen";
              const origenCod =
                typeof t.sucursalOrigenId === "object"
                  ? (t.sucursalOrigenId as unknown as Sucursal).codigo
                  : "";

              const destino =
                typeof t.sucursalDestinoId === "object"
                  ? (t.sucursalDestinoId as unknown as Sucursal).nombre
                  : "Destino";
              const destinoCod =
                typeof t.sucursalDestinoId === "object"
                  ? (t.sucursalDestinoId as unknown as Sucursal).codigo
                  : "";

              const solicitante =
                typeof t.solicitadoPor === "object" && t.solicitadoPor !== null
                  ? t.solicitadoPor.nombreCompleto
                  : null;

              // Resolver imágenes y modelos
              const itemsResolved = (t.items || []).map((it) => {
                const liveProd = productosMap[it.productoId];
                const liveVariant = liveProd?.variantes?.find((v) => v.varianteId === it.varianteId);
                const resolvedImage =
                  it.varianteSnapshot?.imagen ||
                  liveVariant?.imagenes?.[0] ||
                  (liveVariant as Record<string, unknown> | undefined)?.imagen as string ||
                  liveProd?.variantes?.find((v) => (v.imagenes && v.imagenes.length > 0))?.imagenes?.[0] ||
                  null;

                const resolvedModelo = it.productoSnapshot?.modelo || liveProd?.modelo || "";

                return {
                  ...it,
                  resolvedImage,
                  resolvedModelo,
                };
              });

              // Extraer modelos únicos
              const uniqueModelos = Array.from(
                new Set(itemsResolved.map((it) => it.resolvedModelo).filter(Boolean))
              );

              return (
                <tr
                  key={t._id}
                  className="hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Codigo & Fecha */}
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {t.numeroTraspaso}
                      </span>
                      {t.estado === "EN_TRANSITO" && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </div>
                    {solicitante && (
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                        Por: {solicitante}
                      </div>
                    )}
                  </td>

                  {/* Ruta */}
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium text-xs">
                        <span>{origen}</span>
                        {origenCod && <span className="font-mono opacity-60 text-[10px]">({origenCod})</span>}
                      </div>
                      <span className="text-slate-500">→</span>
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium text-xs">
                        <span>{destino}</span>
                        {destinoCod && <span className="font-mono opacity-60 text-[10px]">({destinoCod})</span>}
                      </div>
                    </div>
                    {t.motivo && (
                      <div className="text-xs text-slate-400 mt-1.5 line-clamp-1 max-w-[260px]">
                        {t.motivo}
                      </div>
                    )}
                  </td>

                  {/* Prendas, Thumbnails & Modelos */}
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-3">
                      {/* Avatar stack */}
                      <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                        {itemsResolved.slice(0, 3).map((it, idx) => (
                          <div
                            key={idx}
                            className="relative rounded-xl border-2 border-slate-900 shadow-md group-hover:scale-105 transition-transform"
                            title={`${it.productoSnapshot?.nombre} (${it.varianteSnapshot?.color} / ${it.varianteSnapshot?.talla})`}
                          >
                            <TraspasoThumb
                              src={it.resolvedImage}
                              alt={it.productoSnapshot?.nombre}
                              size="sm"
                            />
                          </div>
                        ))}
                        {itemsResolved.length > 3 && (
                          <div className="relative w-10 h-10 rounded-xl bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-slate-300">
                            +{itemsResolved.length - 3}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex px-2 py-0.5 rounded-lg bg-white/10 font-bold text-white text-xs">
                            {t.totalPrendasEnviadas} un.
                          </span>
                          <span className="text-xs text-slate-400">
                            ({itemsResolved.length} {itemsResolved.length === 1 ? "ítem" : "ítems"})
                          </span>
                        </div>

                        {uniqueModelos.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {uniqueModelos.slice(0, 2).map((m, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                              >
                                {m}
                              </span>
                            ))}
                            {uniqueModelos.length > 2 && (
                              <span className="text-[9px] text-slate-500">
                                +{uniqueModelos.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Valor Costo */}
                  <td className="px-5 py-4 align-top text-right">
                    <span className="font-bold text-cyan-300 text-sm font-mono block">
                      {formatMoney(t.valorTotalCostoTraspaso)}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Costo valorado
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-5 py-4 align-top text-center">
                    <TraspasoStatusBadge estado={t.estado} size="sm" />
                    {t.estado === "RECIBIDA" && t.totalPrendasRecibidas !== undefined && (
                      <span className="block text-[10px] text-emerald-400 mt-1">
                        {t.totalPrendasRecibidas} un. ingresadas
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-5 py-4 align-top text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Despachar */}
                      {t.estado === "SOLICITADA" && onDespachar && (
                        <button
                          disabled={actionLoading}
                          onClick={() => onDespachar(t._id)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-950/30 transition cursor-pointer disabled:opacity-50"
                        >
                          Despachar
                        </button>
                      )}

                      {/* Recibir */}
                      {t.estado === "EN_TRANSITO" && onRecibir && (
                        <button
                          disabled={actionLoading}
                          onClick={() => onRecibir(t)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/30 transition cursor-pointer disabled:opacity-50"
                        >
                          Recibir
                        </button>
                      )}

                      {/* Ver */}
                      <button
                        onClick={() => onView(t)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition cursor-pointer"
                      >
                        Ver
                      </button>

                      {/* Imprimir Guia */}
                      {onPrint && (
                        <button
                          onClick={() => onPrint(t)}
                          title="Imprimir Guía de Traspaso"
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      )}

                      {/* Cancelar */}
                      {t.estado === "SOLICITADA" && onCancelar && (
                        <button
                          disabled={actionLoading}
                          onClick={() => onCancelar(t._id)}
                          title="Cancelar"
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
