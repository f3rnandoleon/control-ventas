"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { DevolucionCambio } from "@/types/devolucionCambio";

interface SucursalItem {
  _id: string;
  nombre: string;
  codigo: string;
}

export default function HistorialDevolucionesPage() {
  const [registros, setRegistros] = useState<DevolucionCambio[]>([]);
  const [sucursales, setSucursales] = useState<SucursalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  // Modal Detalle
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<DevolucionCambio | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroSucursal) params.set("sucursalId", filtroSucursal);
      if (filtroTipo) params.set("tipo", filtroTipo);
      if (filtroDesde) params.set("desde", filtroDesde);
      if (filtroHasta) params.set("hasta", filtroHasta);

      const [resDev, resSuc] = await Promise.all([
        fetch(`/api/admin/finanzas/devoluciones?${params.toString()}`),
        fetch("/api/admin/sucursales"),
      ]);

      if (resDev.ok) {
        setRegistros(await resDev.json());
      }
      if (resSuc.ok) {
        setSucursales(await resSuc.json());
      }
    } catch {
      toast.error("Error al cargar historial de devoluciones");
    } finally {
      setLoading(false);
    }
  }, [filtroSucursal, filtroTipo, filtroDesde, filtroHasta]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Filtrado local por texto
  const registrosFiltrados = registros.filter((r) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      r.numeroOperacion?.toLowerCase().includes(q) ||
      r.numeroPedido?.toLowerCase().includes(q) ||
      r.observaciones?.toLowerCase().includes(q)
    );
  });

  // Métricas
  const totalOperaciones = registrosFiltrados.length;
  const totalReembolsado = registrosFiltrados
    .filter((r) => r.accionMonetaria === "REEMBOLSO_CLIENTE")
    .reduce((acc, r) => acc + (r.diferenciaMonto || 0), 0);
  const totalCobrosAdicionales = registrosFiltrados
    .filter((r) => r.accionMonetaria === "COBRO_ADICIONAL")
    .reduce((acc, r) => acc + (r.diferenciaMonto || 0), 0);
  const totalPrendasMerma = registrosFiltrados.reduce((acc, r) => {
    const cant = (r.itemsDevueltos || [])
      .filter((i) => i.destinoFisico === "MERMA_DANADO")
      .reduce((sub, i) => sub + i.cantidad, 0);
    return acc + cant;
  }, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Historial de Devoluciones y Cambios
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-gray-400">
            Auditoría de prendas reingresadas a stock, bajas por merma y liquidación de dinero.
          </p>
        </div>
        <button
          onClick={cargarDatos}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Tarjetas Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Operaciones</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{totalOperaciones}</p>
          <span className="text-[11px] text-slate-500">Devoluciones y Cambios</span>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase">Reembolsos a Clientes</p>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">Bs {totalReembolsado.toFixed(2)}</p>
          <span className="text-[11px] text-rose-600/80 dark:text-rose-500/80">Salidas de dinero registradas</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Cobros Adicionales</p>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">Bs {totalCobrosAdicionales.toFixed(2)}</p>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-500/80">Diferencia cobrada a favor</span>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase">Prendas a Merma</p>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{totalPrendasMerma} uds</p>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-500/80">Prendas con falla / dañadas</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 text-xs shadow-sm">
        <input
          type="text"
          placeholder="Buscar por # Operación o # Pedido..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 flex-1 min-w-[200px] focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <select
          value={filtroSucursal}
          onChange={(e) => setFiltroSucursal(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map((s) => (
            <option key={s._id} value={s._id}>
              {s.nombre} ({s.codigo})
            </option>
          ))}
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          <option value="DEVOLUCION">Solo Devoluciones</option>
          <option value="CAMBIO">Solo Cambios de Prenda</option>
        </select>

        <div className="flex items-center gap-1">
          <span className="text-slate-600 dark:text-slate-400">Desde:</span>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-600 dark:text-slate-400">Hasta:</span>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 shadow-sm">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Operación & Fecha</th>
              <th className="px-4 py-3 font-semibold">Pedido Origen</th>
              <th className="px-4 py-3 font-semibold">Sucursal</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Prendas Devueltas</th>
              <th className="px-4 py-3 font-semibold">Prendas Nuevas</th>
              <th className="px-4 py-3 font-semibold">Liquidación Dinero</th>
              <th className="px-4 py-3 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="inline-block animate-spin text-xl mb-2">⏳</div>
                  <p>Cargando operaciones...</p>
                </td>
              </tr>
            ) : registrosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  No se encontraron devoluciones o cambios registrados con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              registrosFiltrados.map((item) => {
                const totalDev = (item.itemsDevueltos || []).reduce((acc, i) => acc + i.cantidad, 0);
                const totalEnt = (item.itemsEntregados || []).reduce((acc, i) => acc + i.cantidad, 0);
                const tieneMerma = (item.itemsDevueltos || []).some((i) => i.destinoFisico === "MERMA_DANADO");

                const sucursalNombre = typeof item.sucursalId === "object" && item.sucursalId !== null
                  ? (item.sucursalId as unknown as SucursalItem).nombre
                  : "—";

                return (
                  <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{item.numeroOperacion}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Intl.DateTimeFormat("es-BO", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.createdAt))}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                      #{item.numeroPedido}
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {sucursalNombre}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                          item.tipo === "DEVOLUCION"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {item.tipo}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 dark:text-white">{totalDev} uds</span>
                      {tieneMerma && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          ⚠️ Merma
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {item.tipo === "CAMBIO" ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalEnt} uds</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {item.accionMonetaria === "REEMBOLSO_CLIENTE" ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          Reembolso: -Bs {item.diferenciaMonto?.toFixed(2)}
                        </span>
                      ) : item.accionMonetaria === "COBRO_ADICIONAL" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Cobro: +Bs {item.diferenciaMonto?.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">Sin diferencia (Bs 0.00)</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetalleSeleccionado(item)}
                        className="rounded-lg bg-indigo-50 dark:bg-indigo-600/20 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/30 transition shadow-sm"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Desglose Operación */}
      {detalleSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 space-y-6 shadow-2xl text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Detalle de {detalleSeleccionado.tipo === "DEVOLUCION" ? "Devolución" : "Cambio"}:{" "}
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">{detalleSeleccionado.numeroOperacion}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pedido Original: #{detalleSeleccionado.numeroPedido} | Registrado:{" "}
                  {new Date(detalleSeleccionado.createdAt).toLocaleString("es-BO")}
                </p>
              </div>
              <button
                onClick={() => setDetalleSeleccionado(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Ítems devueltos */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                1. Prendas Devueltas por el Cliente
              </h4>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-2">
                {detalleSeleccionado.itemsDevueltos.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2 last:border-0 last:pb-0 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {item.nombre} ({item.talla} / {item.color})
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Cantidad: {item.cantidad} | P. Unitario: Bs {item.precioUnitario?.toFixed(2)} | Motivo: &quot;{item.motivo}&quot;
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.destinoFisico === "REINGRESO_STOCK"
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {item.destinoFisico === "REINGRESO_STOCK" ? "Reingresado a Stock" : "Merma / Dañado"}
                      </span>
                      <p className="font-bold text-rose-600 dark:text-rose-400 text-xs mt-1">
                        Subtotal: Bs {item.subtotal?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ítems entregados (si aplica) */}
            {detalleSeleccionado.itemsEntregados && detalleSeleccionado.itemsEntregados.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  2. Nuevas Prendas Entregadas en Cambio
                </h4>
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-2">
                  {detalleSeleccionado.itemsEntregados.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2 last:border-0 last:pb-0 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.nombre} ({item.talla} / {item.color})
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Cantidad: {item.cantidad} | P. Unitario: Bs {item.precioUnitario?.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          Subtotal: Bs {item.subtotal?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen Monetario */}
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Valor de prendas devueltas:</span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">Bs {detalleSeleccionado.montoDevolucion?.toFixed(2)}</span>
              </div>
              {detalleSeleccionado.tipo === "CAMBIO" && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Valor de prendas entregadas:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">Bs {detalleSeleccionado.montoEntregado?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 dark:border-white/10 pt-2 font-bold text-sm">
                <span className="text-slate-900 dark:text-white">Resultado Financiero:</span>
                <span
                  className={
                    detalleSeleccionado.accionMonetaria === "REEMBOLSO_CLIENTE"
                      ? "text-rose-600 dark:text-rose-400"
                      : detalleSeleccionado.accionMonetaria === "COBRO_ADICIONAL"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-700 dark:text-slate-300"
                  }
                >
                  {detalleSeleccionado.accionMonetaria === "REEMBOLSO_CLIENTE"
                    ? `Reembolso de Bs ${detalleSeleccionado.diferenciaMonto?.toFixed(2)}`
                    : detalleSeleccionado.accionMonetaria === "COBRO_ADICIONAL"
                    ? `Cobro adicional de Bs ${detalleSeleccionado.diferenciaMonto?.toFixed(2)}`
                    : "Cambio mano a mano (Bs 0.00)"}
                </span>
              </div>
              {detalleSeleccionado.observaciones && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                  Observaciones: &quot;{detalleSeleccionado.observaciones}&quot;
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setDetalleSeleccionado(null)}
                className="rounded-xl border border-slate-200 dark:border-transparent bg-slate-100 dark:bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
