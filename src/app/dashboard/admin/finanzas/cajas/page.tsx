"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { SesionCaja } from "@/types/sesionCaja";

export default function HistorialCajasPosPage() {
  const [sesiones, setSesiones] = useState<SesionCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSucursal, setFiltroSucursal] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [sucursales, setSucursales] = useState<Array<{ _id: string; nombre: string; codigo: string }>>([]);

  const cargarSesiones = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroSucursal) params.set("sucursalId", filtroSucursal);
      if (filtroEstado) params.set("estado", filtroEstado);

      const [resSesiones, resSucursales] = await Promise.all([
        fetch(`/api/admin/pos/cajas?${params.toString()}`),
        fetch("/api/admin/sucursales"),
      ]);

      if (resSesiones.ok) setSesiones(await resSesiones.json());
      if (resSucursales.ok) setSucursales(await resSucursales.json());
    } catch {
      toast.error("Error al cargar historial de cajas");
    } finally {
      setLoading(false);
    }
  }, [filtroSucursal, filtroEstado]);

  useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Sesiones de Caja & Arqueos (POS)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            Supervisión de aperturas y cierres diarios de mostrador por sucursal y vendedor.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs">
        <select
          value={filtroSucursal}
          onChange={(e) => setFiltroSucursal(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 p-2 text-white"
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map((s) => (
            <option key={s._id} value={s._id}>
              {s.nombre} ({s.codigo})
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 p-2 text-white"
        >
          <option value="">Todos los estados</option>
          <option value="ABIERTA">Abiertas actualmente</option>
          <option value="CERRADA">Cerradas</option>
        </select>
      </div>

      {/* Tabla de Sesiones */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="border-b border-white/10 bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="p-3">Sesión #</th>
                <th className="p-3">Sucursal / Cajero</th>
                <th className="p-3">Apertura</th>
                <th className="p-3">Ventas Registradas</th>
                <th className="p-3">Cierre / Arqueo</th>
                <th className="p-3 text-right">Diferencia</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Cargando sesiones...
                  </td>
                </tr>
              ) : sesiones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No hay sesiones de caja registradas con estos filtros.
                  </td>
                </tr>
              ) : (
                sesiones.map((s) => {
                  const sucObj = s.sucursalId as unknown as { nombre?: string; codigo?: string } | undefined;
                  const usrObj = s.usuarioAperturaId as unknown as { nombreCompleto?: string } | undefined;
                  const esAbierta = s.estado === "ABIERTA";
                  const dif = s.diferenciaEfectivo ?? 0;

                  return (
                    <tr key={s._id} className="hover:bg-white/5 transition">
                      <td className="p-3 font-bold text-white">
                        #{s._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{sucObj?.nombre || "Sucursal"}</div>
                        <div className="text-[10px] text-gray-400">
                          {usrObj?.nombreCompleto || "Vendedor"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-200">
                          Fondo: <strong>Bs {s.montoApertura.toFixed(2)}</strong>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(s.fechaApertura).toLocaleString("es-BO")}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-emerald-300 font-semibold">
                          Efectivo: Bs {s.totalVentasEfectivo.toFixed(2)}
                        </div>
                        <div className="text-cyan-300 font-semibold">
                          QR / Banco: Bs {s.totalVentasQR.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Esperado: Bs {s.montoEsperadoEfectivo.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-3">
                        {s.fechaCierre ? (
                          <>
                            <div className="font-bold text-white">
                              Declarado: Bs {(s.montoDeclaradoEfectivo || 0).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(s.fechaCierre).toLocaleString("es-BO")}
                            </div>
                          </>
                        ) : (
                          <span className="text-amber-400 italic">En curso...</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-black">
                        {esAbierta ? (
                          <span className="text-gray-500">-</span>
                        ) : Math.abs(dif) < 0.01 ? (
                          <span className="text-emerald-400">Exacto (Bs 0.00)</span>
                        ) : dif > 0 ? (
                          <span className="text-cyan-400">+ Bs {dif.toFixed(2)} (Sobrante)</span>
                        ) : (
                          <span className="text-rose-400">- Bs {Math.abs(dif).toFixed(2)} (Faltante)</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                            esAbierta
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "bg-slate-700/50 text-gray-300 border-white/10"
                          }`}
                        >
                          {s.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
