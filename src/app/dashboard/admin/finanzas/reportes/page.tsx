"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { EstadoResultadosReporte, CierrePeriodoItem } from "@/types/reporteFinanciero";

export default function EstadoResultadosPage() {
  const ahora = new Date();
  const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split("T")[0];
  const hoy = ahora.toISOString().split("T")[0];

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);
  const [sucursalId, setSucursalId] = useState("");
  const [sucursales, setSucursales] = useState<Array<{ _id: string; nombre: string; codigo: string }>>([]);

  const [reporte, setReporte] = useState<EstadoResultadosReporte | null>(null);
  const [loading, setLoading] = useState(true);

  // Cierre de periodo
  const [periodosCerrados, setPeriodosCerrados] = useState<CierrePeriodoItem[]>([]);
  const [modalCierrePeriodoOpen, setModalCierrePeriodoOpen] = useState(false);
  const [mesCierre, setMesCierre] = useState(ahora.getMonth() + 1);
  const [anioCierre, setAnioCierre] = useState(ahora.getFullYear());
  const [obsCierre, setObsCierre] = useState("");
  const [submittingCierre, setSubmittingCierre] = useState(false);

  const cargarReporte = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ desde, hasta });
      if (sucursalId) params.set("sucursalId", sucursalId);

      const [resReporte, resSucursales, resPeriodos] = await Promise.all([
        fetch(`/api/admin/finanzas/reportes/estado-resultados?${params.toString()}`),
        fetch("/api/admin/sucursales"),
        fetch("/api/admin/finanzas/periodos"),
      ]);

      if (resReporte.ok) setReporte(await resReporte.json());
      if (resSucursales.ok) setSucursales(await resSucursales.json());
      if (resPeriodos.ok) setPeriodosCerrados(await resPeriodos.json());
    } catch {
      toast.error("Error al cargar Estado de Resultados");
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, sucursalId]);

  useEffect(() => {
    cargarReporte();
  }, [cargarReporte]);

  const handleCerrarPeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingCierre(true);
      const res = await fetch("/api/admin/finanzas/periodos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anio: anioCierre,
          mes: mesCierre,
          observaciones: obsCierre,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error al cerrar periodo");

      toast.success("Periodo contable cerrado y bloqueado con éxito");
      setModalCierrePeriodoOpen(false);
      setObsCierre("");
      await cargarReporte();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cerrar periodo");
    } finally {
      setSubmittingCierre(false);
    }
  };

  const handleReabrirPeriodo = async (id: string, nombre: string) => {
    if (!confirm(`¿Reabrir temporalmente el periodo ${nombre}?`)) return;

    try {
      const res = await fetch(`/api/admin/finanzas/periodos/${id}/reabrir`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error al reabrir");

      toast.success("Periodo contable reabierto");
      await cargarReporte();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al reabrir periodo");
    }
  };

  const m = reporte?.metricas;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Estado de Resultados (P&L)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            Utilidad Bruta, Costo de Ventas (COGS), Gastos Operativos y Utilidad Neta real.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalCierrePeriodoOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/50 px-4 py-2 text-xs sm:text-sm font-bold text-amber-300 transition shadow-lg"
        >
          <span>🔒</span> Cerrar Periodo Contable
        </button>
      </div>

      {/* Controles de Filtro */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400">Desde:</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400">Hasta:</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400">Sucursal:</label>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white"
          >
            <option value="">Todas las sucursales (Consolidado)</option>
            {sucursales.map((s) => (
              <option key={s._id} value={s._id}>
                {s.nombre} ({s.codigo})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={cargarReporte}
          className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition"
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-gray-400">Calculando Estado de Resultados...</div>
      ) : !m ? (
        <div className="p-12 text-center text-sm text-gray-400">Sin datos disponibles.</div>
      ) : (
        <>
          {/* Tarjetas Principales de Cascada P&L */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Ventas Netas */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                1. Ventas Netas
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-white">
                Bs {m.ventasNetas.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                {m.cantidadPedidos} pedidos • {m.prendasVendidas} prendas
              </p>
            </div>

            {/* Costo de Ventas (COGS) */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                2. Costo Mercancía (COGS)
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-rose-400">
                Bs {m.costoVentasCOGS.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Costo histórico de las prendas vendidas
              </p>
            </div>

            {/* Utilidad Bruta */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-slate-900 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  3. Utilidad Bruta
                </p>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                  {m.margenBrutoPorcentaje.toFixed(1)}% margen
                </span>
              </div>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-cyan-200">
                Bs {m.utilidadBruta.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-cyan-300/70">Ventas netas - Costo de ventas</p>
            </div>

            {/* Utilidad Neta Real */}
            <div
              className={`rounded-2xl border p-5 shadow-xl ${
                m.utilidadNeta >= 0
                  ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 to-slate-900"
                  : "border-rose-500/40 bg-gradient-to-br from-rose-950/50 to-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    m.utilidadNeta >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  4. Utilidad Neta (Net Income)
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    m.utilidadNeta >= 0
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {m.margenNetoPorcentaje.toFixed(1)}% margen
                </span>
              </div>
              <p
                className={`mt-1 text-2xl sm:text-3xl font-black ${
                  m.utilidadNeta >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                Bs {m.utilidadNeta.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Ganancia limpia de la empresa
              </p>
            </div>
          </div>

          {/* Cascada de Desglose Contable */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cascada Detallada */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span>📊</span> Desglose Estado de Resultados
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300 font-medium">(+) Ventas Brutas</span>
                  <span className="font-bold text-white">Bs {m.ventasBrutas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-amber-300">
                  <span>(-) Descuentos en Ventas</span>
                  <span className="font-bold">- Bs {m.descuentos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/10 bg-white/5 px-2 rounded-lg font-bold text-white">
                  <span>(=) VENTAS NETAS</span>
                  <span>Bs {m.ventasNetas.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/5 text-rose-300">
                  <span>(-) Costo de Mercancía Vendida (COGS)</span>
                  <span className="font-bold">- Bs {m.costoVentasCOGS.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/10 bg-cyan-950/30 px-2 rounded-lg font-bold text-cyan-300">
                  <span>(=) UTILIDAD BRUTA</span>
                  <span>Bs {m.utilidadBruta.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/5 text-gray-400 pl-3">
                  <span>• Gastos Fijos (Alquiler, sueldos base...)</span>
                  <span>- Bs {m.gastosFijos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-gray-400 pl-3">
                  <span>• Gastos Variables (Marketing, empaques...)</span>
                  <span>- Bs {m.gastosVariables.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-rose-300 font-medium">
                  <span>(-) Total Gastos Operativos (OPEX)</span>
                  <span className="font-bold">- Bs {m.gastosOperativosTotal.toFixed(2)}</span>
                </div>

                {m.mermasTotal > 0 && (
                  <div className="flex justify-between py-1 border-b border-white/5 text-rose-400 font-medium">
                    <span>(-) Pérdida por Mermas / Dañados</span>
                    <span className="font-bold">- Bs {m.mermasTotal.toFixed(2)}</span>
                  </div>
                )}

                <div
                  className={`flex justify-between py-2.5 px-3 rounded-xl font-black text-sm mt-2 border ${
                    m.utilidadNeta >= 0
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}
                >
                  <span>(=) UTILIDAD NETA DEL PERIODO</span>
                  <span>Bs {m.utilidadNeta.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Gastos por Categoría */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <span>🏷️</span> Gastos Operativos por Categoría
                </h3>
                {reporte.gastosPorCategoria.length === 0 ? (
                  <p className="text-xs text-gray-400 py-8 text-center">
                    No hay gastos operativos registrados en este periodo.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reporte.gastosPorCategoria.map((cat) => {
                      const porc =
                        m.gastosOperativosTotal > 0
                          ? ((cat.monto / m.gastosOperativosTotal) * 100).toFixed(1)
                          : "0";
                      return (
                        <div key={cat.categoria} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-gray-200">
                              {cat.categoria}{" "}
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({cat.naturaleza})
                              </span>
                            </span>
                            <span className="font-bold text-white">
                              Bs {cat.monto.toFixed(2)} ({porc}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                              style={{ width: `${Math.min(100, parseFloat(porc))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desglose Comparativo por Sucursales */}
          {reporte.desglosePorSucursales.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span>🏪</span> Rentabilidad Desglosada por Sucursal
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="border-b border-white/10 bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="p-3">Sucursal</th>
                      <th className="p-3 text-right">Ventas Netas</th>
                      <th className="p-3 text-right">Costo (COGS)</th>
                      <th className="p-3 text-right">Utilidad Bruta</th>
                      <th className="p-3 text-right">Gastos OPEX</th>
                      <th className="p-3 text-right font-black">Utilidad Neta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reporte.desglosePorSucursales.map((suc) => (
                      <tr key={suc.sucursalId} className="hover:bg-white/5 transition">
                        <td className="p-3 font-bold text-white">
                          {suc.nombreSucursal} ({suc.codigoSucursal})
                        </td>
                        <td className="p-3 text-right font-semibold text-white">
                          Bs {suc.ventasNetas.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-rose-300">
                          Bs {suc.costoVentasCOGS.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-semibold text-cyan-300">
                          Bs {suc.utilidadBruta.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-rose-300">
                          Bs {suc.gastosOperativos.toFixed(2)}
                        </td>
                        <td
                          className={`p-3 text-right font-black text-sm ${
                            suc.utilidadNeta >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          Bs {suc.utilidadNeta.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historial de Periodos Cerrados */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span>🔒</span> Periodos Contables Cerrados & Bloqueados
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Los meses cerrados quedan sellados para evitar modificaciones accidentales en fechas pasadas.
            </p>

            {periodosCerrados.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-white/10 rounded-xl">
                No hay periodos cerrados todavía.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {periodosCerrados.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/60 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{p.mesNombre}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            p.bloqueado
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {p.bloqueado ? "BLOQUEADO" : "ABIERTO"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Resultado al cierre:{" "}
                        <strong className="text-emerald-300">
                          Bs {(p.utilidadNetaAlCierre || 0).toFixed(2)}
                        </strong>
                      </p>
                    </div>

                    {p.bloqueado && (
                      <button
                        type="button"
                        onClick={() => handleReabrirPeriodo(p._id, p.mesNombre)}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-gray-300 hover:bg-white/10"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL CERRAR PERIODO */}
      {modalCierrePeriodoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔒</span> Cerrar y Bloquear Periodo Contable
              </h3>
              <button
                type="button"
                onClick={() => setModalCierrePeriodoOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCerrarPeriodo} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Mes *</label>
                  <select
                    value={mesCierre}
                    onChange={(e) => setMesCierre(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    {[
                      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                    ].map((nombre, i) => (
                      <option key={nombre} value={i + 1}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Año *</label>
                  <input
                    type="number"
                    value={anioCierre}
                    onChange={(e) => setAnioCierre(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={obsCierre}
                  onChange={(e) => setObsCierre(e.target.value)}
                  placeholder="Ej. Cierre contable mensual revisado con estados de cuenta..."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalCierrePeriodoOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCierre}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {submittingCierre ? "Cerrando..." : "Confirmar Cierre y Bloqueo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
