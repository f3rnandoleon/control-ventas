"use client";

import { useEffect, useState, useRef } from "react";
import { getKardexProducto, KardexProductoDetalleResponse } from "@/services/kardex.service";
import { getSucursales } from "@/services/sucursales.service";
import type { Sucursal } from "@/types/sucursal";
import { formatMoney } from "@/utils/pricing";

export default function KardexIndividualModal({
  productoId,
  initialVarianteId,
  onClose,
}: {
  productoId: string;
  initialVarianteId?: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<KardexProductoDetalleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVarianteId, setSelectedVarianteId] = useState<string>(initialVarianteId || "");
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const hasAutoSelectedRef = useRef(Boolean(initialVarianteId));

  useEffect(() => {
    getSucursales().then(setSucursales).catch(() => {});
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getKardexProducto(
          productoId,
          selectedVarianteId || undefined,
          selectedSucursalId || undefined
        );
        if (isCancelled) return;
        setData(res);

        // Si no se especificó variante inicial y aún no se seleccionó una,
        // auto-seleccionar por defecto la primera variante para abrir la tarjeta individual real
        if (!hasAutoSelectedRef.current && res.producto?.variantes?.length > 0 && !selectedVarianteId) {
          hasAutoSelectedRef.current = true;
          setSelectedVarianteId(res.producto.variantes[0].varianteId || "");
        }
      } catch (err) {
        if (!isCancelled) console.error("Error al cargar kardex:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    load();
    return () => {
      isCancelled = true;
    };
  }, [productoId, selectedVarianteId, selectedSucursalId]);

  const activeVariante = data?.producto.variantes.find(
    (v) => v.varianteId === selectedVarianteId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-gray-900 border border-white/10 shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-gray-900/90">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TARJETA KARDEX VALORADA
              </span>
              <span className="text-xs text-gray-400">Método: Costo Promedio Ponderado (CPP)</span>
              {activeVariante ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Variante: {activeVariante.color} / Talla {activeVariante.talla}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Mezcla movimientos de todas las tallas y colores">
                  Vista Consolidada (Todas las variantes)
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white mt-1">
              {data?.producto.nombre || "Cargando producto..."}{" "}
              {data?.producto.modelo && (
                <span className="text-cyan-400">({data.producto.modelo})</span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              SKU: {data?.producto.sku || "-"} | Categoría: {data?.producto.categoria || "General"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold p-1 leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* BARRA DE FILTRO Y KPIS ACTUALES */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-400">
                  Variante:
                </label>
                <select
                  value={selectedVarianteId}
                  onChange={(e) => {
                    hasAutoSelectedRef.current = true;
                    setSelectedVarianteId(e.target.value);
                  }}
                  className="rounded-xl bg-gray-800 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">📊 Consolidado del modelo (Todas las variantes)</option>
                  {data?.producto.variantes.map((v) => (
                    <option key={v.varianteId} value={v.varianteId}>
                      Talla {v.talla} - Color {v.color} (Stock: {v.stock} u.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-400">
                  Sucursal:
                </label>
                <select
                  value={selectedSucursalId}
                  onChange={(e) => setSelectedSucursalId(e.target.value)}
                  className="rounded-xl bg-gray-800 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todas las ubicaciones</option>
                  {sucursales.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.nombre} ({s.codigo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* KPIS DE SALDO ACTUAL */}
            {data && (
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <div>
                  <span className="text-[10px] text-gray-400 block">Stock Físico</span>
                  <span className="text-sm font-bold text-white">
                    {data.saldoFisicoActual} u.
                  </span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <span className="text-[10px] text-gray-400 block">Costo Promedio (CPP)</span>
                  <span className="text-sm font-bold text-cyan-300">
                    {formatMoney(data.costoPromedioActual)}
                  </span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <span className="text-[10px] text-gray-400 block">Saldo Valorado</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatMoney(data.saldoValoradoActual)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* TABLA FORMAL DE KARDEX */}
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-white/5" />
          ) : !data || data.movimientos.length === 0 ? (
            <div className="p-12 text-center text-gray-400 border border-white/10 rounded-xl bg-white/5">
              No hay movimientos registrados para este producto o variante.
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-gray-300">
                  <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                    <tr className="border-b border-white/10 text-[11px]">
                      <th rowSpan={2} className="px-3 py-2 text-left">Fecha</th>
                      <th rowSpan={2} className="px-3 py-2 text-left">Ubicación</th>
                      <th rowSpan={2} className="px-3 py-2 text-left">Documento / Ref</th>
                      <th rowSpan={2} className="px-3 py-2 text-left">Tipo</th>
                      <th rowSpan={2} className="px-3 py-2 text-left">Variante</th>
                      <th colSpan={3} className="px-3 py-1.5 text-center bg-cyan-950/40 text-cyan-300 border-l border-r border-white/10">
                        ENTRADAS
                      </th>
                      <th colSpan={3} className="px-3 py-1.5 text-center bg-amber-950/30 text-amber-300 border-r border-white/10">
                        SALIDAS
                      </th>
                      <th colSpan={3} className="px-3 py-1.5 text-center bg-emerald-950/30 text-emerald-300">
                        SALDOS
                      </th>
                    </tr>
                    <tr className="text-[10px]">
                      {/* Entradas */}
                      <th className="px-2 py-1.5 text-center border-l border-white/10">Cant</th>
                      <th className="px-2 py-1.5 text-right">C. Unit</th>
                      <th className="px-2 py-1.5 text-right border-r border-white/10">Total Bs</th>
                      {/* Salidas */}
                      <th className="px-2 py-1.5 text-center">Cant</th>
                      <th className="px-2 py-1.5 text-right">C. Unit</th>
                      <th className="px-2 py-1.5 text-right border-r border-white/10">Total Bs</th>
                      {/* Saldos */}
                      <th className="px-2 py-1.5 text-center font-bold text-white">Stock</th>
                      <th className="px-2 py-1.5 text-right font-bold text-cyan-300">CPP</th>
                      <th className="px-2 py-1.5 text-right font-bold text-emerald-400">Total Bs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.movimientos.map((m) => {
                      const fechaStr = new Date(m.fecha).toLocaleString("es-BO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const isEntrada =
                        m.tipo === "ENTRADA" ||
                        m.tipo === "DEVOLUCION" ||
                        m.tipo === "TRASPASO_ENTRADA" ||
                        (m.tipo === "AJUSTE" && m.entradaCantidad > 0);
                      const isTraspaso =
                        m.tipo === "TRASPASO_ENTRADA" || m.tipo === "TRASPASO_SALIDA";
                      const isAjuste = m.tipo === "AJUSTE";

                      return (
                        <tr key={m._id} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2.5 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                            {fechaStr}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-300">
                            {m.sucursal ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 font-medium text-gray-200">
                                {m.sucursal}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-gray-200">
                            <div>{m.referencia}</div>
                            {m.motivo && m.motivo !== "-" && (
                              <div className="text-[10px] text-gray-500 truncate max-w-[140px]">
                                {m.motivo}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isTraspaso
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : isAjuste
                                    ? isEntrada
                                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : isEntrada
                                      ? "bg-cyan-500/20 text-cyan-300"
                                      : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {m.tipo}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-cyan-200">
                            {m.variante.color} - {m.variante.talla}
                          </td>

                          {/* ENTRADAS */}
                          <td className="px-2 py-2.5 text-center border-l border-white/10 font-bold text-cyan-300">
                            {m.entradaCantidad > 0 ? `+${m.entradaCantidad}` : "-"}
                          </td>
                          <td className="px-2 py-2.5 text-right text-gray-300">
                            {m.entradaCantidad > 0 ? formatMoney(m.costoUnitario) : "-"}
                          </td>
                          <td className="px-2 py-2.5 text-right border-r border-white/10 font-semibold text-cyan-300">
                            {m.debe > 0 ? formatMoney(m.debe) : "-"}
                          </td>

                          {/* SALIDAS */}
                          <td className="px-2 py-2.5 text-center font-bold text-amber-300">
                            {m.salidaCantidad > 0 ? `-${m.salidaCantidad}` : "-"}
                          </td>
                          <td className="px-2 py-2.5 text-right text-gray-300">
                            {m.salidaCantidad > 0 ? formatMoney(m.costoUnitario) : "-"}
                          </td>
                          <td className="px-2 py-2.5 text-right border-r border-white/10 font-semibold text-amber-300">
                            {m.haber > 0 ? formatMoney(m.haber) : "-"}
                          </td>

                          {/* SALDOS */}
                          <td className="px-2 py-2.5 text-center font-bold text-white">
                            {m.saldoCantidad} u.
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono font-semibold text-cyan-300">
                            {formatMoney(m.costoPromedio)}
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono font-bold text-emerald-400">
                            {formatMoney(m.saldoValorado)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-white/10 bg-gray-900/90 flex justify-between items-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition"
          >
            🖨️ Imprimir Kardex
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
