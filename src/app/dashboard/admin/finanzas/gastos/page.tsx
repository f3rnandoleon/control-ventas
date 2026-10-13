"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { Gasto, CategoriaGasto, NaturalezaGasto } from "@/types/gasto";
import type { CuentaDinero } from "@/types/cuentaDinero";

const CATEGORIAS_GASTO: Array<{ value: CategoriaGasto; label: string }> = [
  { value: "ALQUILER_TIENDA", label: "Alquiler de local / tienda" },
  { value: "SUELDOS_COMISIONES", label: "Sueldos y comisiones personal" },
  { value: "SERVICIOS_BASICOS", label: "Servicios básicos (Luz, agua, internet)" },
  { value: "PUBLICIDAD_MARKETING", label: "Publicidad y Marketing (Meta, TikTok)" },
  { value: "TRANSPORTE_ENVIOS", label: "Transporte y Envíos / Delivery" },
  { value: "EMPAQUES_BOLSAS", label: "Empaques y Bolsas de despacho" },
  { value: "MANTENIMIENTO_LIMPIEZA", label: "Mantenimiento y Reparaciones" },
  { value: "OTROS", label: "Otros gastos varios" },
];

export default function GastosOperativosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cuentas, setCuentas] = useState<CuentaDinero[]>([]);
  const [sucursales, setSucursales] = useState<Array<{ _id: string; nombre: string; codigo: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroNaturaleza, setFiltroNaturaleza] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("");

  // Modal Registro
  const [modalOpen, setModalOpen] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaGasto>("SERVICIOS_BASICOS");
  const [naturaleza, setNaturaleza] = useState<NaturalezaGasto>("VARIABLE");
  const [monto, setMonto] = useState<number>(0);
  const [descripcion, setDescripcion] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [cuentaDineroId, setCuentaDineroId] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [fechaGasto, setFechaGasto] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      if (filtroNaturaleza) params.set("naturaleza", filtroNaturaleza);
      if (filtroSucursal) params.set("sucursalId", filtroSucursal);

      const [resGastos, resCuentas, resSucursales] = await Promise.all([
        fetch(`/api/admin/finanzas/gastos?${params.toString()}`),
        fetch("/api/admin/finanzas/cuentas?activa=true"),
        fetch("/api/admin/sucursales"),
      ]);

      if (resGastos.ok) setGastos(await resGastos.json());
      if (resCuentas.ok) {
        const dataCuentas = await resCuentas.json();
        setCuentas(dataCuentas);
        if (dataCuentas.length > 0 && !cuentaDineroId) {
          setCuentaDineroId(dataCuentas[0]._id);
        }
      }
      if (resSucursales.ok) setSucursales(await resSucursales.json());
    } catch {
      toast.error("Error al cargar datos de gastos");
    } finally {
      setLoading(false);
    }
  }, [filtroCategoria, filtroNaturaleza, filtroSucursal, cuentaDineroId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleRegistrarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    if (!cuentaDineroId) {
      toast.error("Selecciona la cuenta de donde sale el dinero");
      return;
    }
    if (!descripcion.trim()) {
      toast.error("Ingresa una descripción del gasto");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/finanzas/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria,
          naturaleza,
          monto,
          descripcion: descripcion.trim(),
          beneficiarioProveedor: beneficiario.trim() || undefined,
          cuentaDineroId,
          sucursalId: sucursalId || undefined,
          fecha: fechaGasto,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error al registrar gasto");

      toast.success("Gasto registrado y fondo debitado correctamente");
      setModalOpen(false);
      setMonto(0);
      setDescripcion("");
      setBeneficiario("");
      await cargarDatos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al registrar gasto");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarGasto = async (id: string, numero: string) => {
    if (!confirm(`¿Estás seguro de anular el gasto ${numero}? Se revertirá el monto a la cuenta de origen.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/finanzas/gastos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error al anular gasto");

      toast.success("Gasto anulado y saldo revertido a la cuenta");
      await cargarDatos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al anular gasto");
    }
  };

  const totalGastosMonto = gastos.reduce((acc, g) => acc + (g.monto || 0), 0);
  const totalFijos = gastos.filter((g) => g.naturaleza === "FIJO").reduce((acc, g) => acc + g.monto, 0);
  const totalVariables = gastos.filter((g) => g.naturaleza === "VARIABLE").reduce((acc, g) => acc + g.monto, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Gastos Operativos (OPEX)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            Control de egresos fijos y variables vinculados a sucursales y cuentas de dinero.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-lg shadow-rose-900/30"
        >
          <span>+</span> Registrar Gasto
        </button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Gastos (Filtrados)</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-rose-400">
            Bs {totalGastosMonto.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Gastos Fijos</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">
            Bs {totalFijos.toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-500">Alquileres, sueldos base, servicios</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Gastos Variables</p>
          <p className="mt-1 text-2xl font-bold text-cyan-300">
            Bs {totalVariables.toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-500">Publicidad, empaques, fletes, comisiones</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs">
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 p-2 text-white"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_GASTO.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={filtroNaturaleza}
          onChange={(e) => setFiltroNaturaleza(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 p-2 text-white"
        >
          <option value="">Toda naturaleza</option>
          <option value="FIJO">Fijos</option>
          <option value="VARIABLE">Variables</option>
        </select>

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
      </div>

      {/* Tabla de Gastos */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="border-b border-white/10 bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="p-3">Gasto # / Fecha</th>
                <th className="p-3">Categoría / Naturaleza</th>
                <th className="p-3">Descripción / Proveedor</th>
                <th className="p-3">Sucursal</th>
                <th className="p-3">Cuenta de Pago</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Cargando gastos...
                  </td>
                </tr>
              ) : gastos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No hay gastos registrados con estos filtros.
                  </td>
                </tr>
              ) : (
                gastos.map((g) => {
                  const sucObj = g.sucursalId as unknown as { nombre?: string; codigo?: string } | undefined;
                  const ctaObj = g.cuentaDineroId as unknown as { nombre?: string } | undefined;
                  return (
                    <tr key={g._id} className="hover:bg-white/5 transition">
                      <td className="p-3 font-semibold text-white">
                        <div>{g.numeroGasto}</div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(g.fecha).toLocaleDateString("es-BO")}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-amber-300">{g.categoria}</span>
                        <div className="text-[10px] text-gray-400">
                          {g.naturaleza === "FIJO" ? "Gasto Fijo" : "Gasto Variable"}
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="line-clamp-1 font-medium text-white">{g.descripcion}</p>
                        {g.beneficiarioProveedor && (
                          <p className="text-[10px] text-gray-400">Para: {g.beneficiarioProveedor}</p>
                        )}
                      </td>
                      <td className="p-3 text-gray-400">
                        {sucObj?.nombre || "Global"}
                      </td>
                      <td className="p-3 font-medium text-gray-300">
                        {ctaObj?.nombre || "Cuenta"}
                      </td>
                      <td className="p-3 text-right font-black text-rose-400 text-sm">
                        Bs {g.monto.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminarGasto(g._id, g.numeroGasto)}
                          title="Anular gasto y revertir saldo"
                          className="rounded-lg p-1 text-gray-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR GASTO */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>💸</span> Registrar Gasto Operativo
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegistrarGasto} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Categoría *</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                  >
                    {CATEGORIAS_GASTO.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Naturaleza *</label>
                  <select
                    value={naturaleza}
                    onChange={(e) => setNaturaleza(e.target.value as NaturalezaGasto)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                  >
                    <option value="VARIABLE">Variable (según ventas/operación)</option>
                    <option value="FIJO">Fijo (recurrente mensual)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Monto (Bs) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    required
                    value={monto || ""}
                    onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-white font-bold text-base focus:border-rose-400 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Fecha de Gasto</label>
                  <input
                    type="date"
                    required
                    value={fechaGasto}
                    onChange={(e) => setFechaGasto(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Cuenta de Egreso (Sale el dinero) *
                  </label>
                  <select
                    required
                    value={cuentaDineroId}
                    onChange={(e) => setCuentaDineroId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                  >
                    {cuentas.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nombre} (Bs {c.saldoActual.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Sucursal Afectada (Opcional)
                  </label>
                  <select
                    value={sucursalId}
                    onChange={(e) => setSucursalId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                  >
                    <option value="">Gasto General / Corporativo</option>
                    {sucursales.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.nombre} ({s.codigo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Descripción / Concepto *</label>
                <input
                  type="text"
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Pago alquiler mes de octubre Tienda 1..."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Beneficiario / Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  value={beneficiario}
                  onChange={(e) => setBeneficiario(e.target.value)}
                  placeholder="Ej. Inmobiliaria Central, Facebook Ads..."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-5 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? "Registrando..." : "Confirmar Gasto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
