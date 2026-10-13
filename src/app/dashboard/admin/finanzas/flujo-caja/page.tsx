"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { FlujoCajaReporte } from "@/types/reporteFinanciero";

export default function FlujoCajaPage() {
  const ahora = new Date();
  const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split("T")[0];
  const hoy = ahora.toISOString().split("T")[0];

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);
  const [reporte, setReporte] = useState<FlujoCajaReporte | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarFlujo = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ desde, hasta });
      const res = await fetch(`/api/admin/finanzas/reportes/flujo-caja?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener flujo de caja");
      const data = await res.json();
      setReporte(data);
    } catch {
      toast.error("Error al cargar reporte de flujo de caja");
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    cargarFlujo();
  }, [cargarFlujo]);

  const exportarCSV = () => {
    if (!reporte || !reporte.cuentas || reporte.cuentas.length === 0) {
      toast.error("No hay datos de flujo para exportar");
      return;
    }
    const headers = [
      "Cuenta",
      "Tipo",
      "Saldo Inicial Estimado",
      "Total Ingresos (+)",
      "Total Egresos (-)",
      "Flujo Neto",
      "Saldo Final Estimado",
    ];
    const rows = reporte.cuentas.map((c) => [
      `"${c.nombreCuenta}"`,
      `"${c.tipoCuenta}"`,
      c.saldoInicialEstimado.toFixed(2),
      c.totalIngresos.toFixed(2),
      c.totalEgresos.toFixed(2),
      c.flujoNeto.toFixed(2),
      c.saldoFinalEstimado.toFixed(2),
    ].join(","));

    // Fila total global
    if (reporte.resumenGlobal) {
      rows.push([
        `"TOTAL CONSOLIDADO"`,
        `""`,
        `""`,
        reporte.resumenGlobal.totalIngresos.toFixed(2),
        reporte.resumenGlobal.totalEgresos.toFixed(2),
        reporte.resumenGlobal.flujoNeto.toFixed(2),
        `""`,
      ].join(","));
    }

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flujo_caja_${desde}_al_${hasta}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Flujo de caja exportado a CSV");
  };

  const global = reporte?.resumenGlobal;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Flujo de Caja (Cash Flow)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            Seguimiento de entradas reales, salidas y liquidez neta por cada cuenta de dinero.
          </p>
        </div>

        <button
          type="button"
          onClick={exportarCSV}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
        >
          <span>📥</span> Exportar CSV
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

        <button
          type="button"
          onClick={cargarFlujo}
          className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition"
        >
          Filtrar
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-gray-400">Calculando flujo de caja...</div>
      ) : !global ? (
        <div className="p-12 text-center text-sm text-gray-400">Sin datos de flujo.</div>
      ) : (
        <>
          {/* Tarjetas Resumen Global */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                (+) Total Ingresos en Periodo
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-400">
                + Bs {global.totalIngresos.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Ventas cobradas y aportes</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                (-) Total Egresos en Periodo
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-rose-400">
                - Bs {global.totalEgresos.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Compras pagadas y gastos operativos</p>
            </div>

            <div
              className={`rounded-2xl border p-5 shadow-lg ${
                global.flujoNeto >= 0
                  ? "border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900"
                  : "border-rose-500/30 bg-gradient-to-br from-rose-950/40 to-slate-900"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  global.flujoNeto >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                (=) Flujo Neto del Periodo
              </p>
              <p
                className={`mt-1 text-2xl sm:text-3xl font-black ${
                  global.flujoNeto >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {global.flujoNeto >= 0 ? "+" : ""} Bs {global.flujoNeto.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Variación de liquidez general</p>
            </div>
          </div>

          {/* Tabla Desglose por Cuentas */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                Desglose Detallado por Cuenta de Dinero
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="border-b border-white/10 bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="p-3">Cuenta</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Saldo Inicial</th>
                    <th className="p-3 text-right text-emerald-400">(+) Ingresos</th>
                    <th className="p-3 text-right text-rose-400">(-) Egresos</th>
                    <th className="p-3 text-right">Flujo Neto</th>
                    <th className="p-3 text-right font-black">Saldo Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(reporte.cuentas || []).map((cta) => {
                    const flujoPositivo = cta.flujoNeto >= 0;
                    return (
                      <tr key={cta.cuentaId} className="hover:bg-white/5 transition">
                        <td className="p-3 font-bold text-white">{cta.nombreCuenta}</td>
                        <td className="p-3 text-gray-400">{cta.tipoCuenta}</td>
                        <td className="p-3 text-right text-gray-300">
                          Bs {cta.saldoInicialEstimado.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-300">
                          + Bs {cta.totalIngresos.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-semibold text-rose-300">
                          - Bs {cta.totalEgresos.toFixed(2)}
                        </td>
                        <td
                          className={`p-3 text-right font-bold ${
                            flujoPositivo ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {flujoPositivo ? "+" : ""} Bs {cta.flujoNeto.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-black text-white text-sm">
                          Bs {cta.saldoFinalEstimado.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
