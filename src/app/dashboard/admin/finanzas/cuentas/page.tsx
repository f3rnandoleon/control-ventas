"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { CuentaDinero, TipoCuentaDinero } from "@/types/cuentaDinero";
import type { MovimientoCuenta } from "@/types/movimientoCuenta";

export default function CuentasFinanzasPage() {
  const [cuentas, setCuentas] = useState<CuentaDinero[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nueva / Editar Cuenta
  const [modalCuentaOpen, setModalCuentaOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaDinero | null>(null);
  const [nombreNueva, setNombreNueva] = useState("");
  const [tipoNueva, setTipoNueva] = useState<TipoCuentaDinero>("CAJA_FISICA");
  const [saldoInicialNueva, setSaldoInicialNueva] = useState<number>(0);
  const [esPredPOS, setEsPredPOS] = useState(false);
  const [esPredQR, setEsPredQR] = useState(false);
  const [sucursalIdNueva, setSucursalIdNueva] = useState("");
  const [sucursales, setSucursales] = useState<Array<{ _id: string; nombre: string; codigo: string }>>([]);

  // Modal Transferencia
  const [modalTransfOpen, setModalTransfOpen] = useState(false);
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [montoTransf, setMontoTransf] = useState<number>(0);
  const [conceptoTransf, setConceptoTransf] = useState("");

  // Modal / Drawer Movimientos
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaDinero | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCuenta[]>([]);
  const [loadingMovs, setLoadingMovs] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const cargarCuentas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/finanzas/cuentas");
      if (!res.ok) throw new Error("Error al cargar cuentas");
      const data = await res.json();
      setCuentas(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar cuentas");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarSucursales = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sucursales");
      if (res.ok) {
        const data = await res.json();
        setSucursales(data);
      }
    } catch {
      // Ignorar
    }
  }, []);

  useEffect(() => {
    cargarCuentas();
    cargarSucursales();
  }, [cargarCuentas, cargarSucursales]);

  const handleOpenCrear = () => {
    setEditingCuenta(null);
    setNombreNueva("");
    setTipoNueva("CAJA_FISICA");
    setSaldoInicialNueva(0);
    setEsPredPOS(false);
    setEsPredQR(false);
    setSucursalIdNueva("");
    setModalCuentaOpen(true);
  };

  const handleOpenEditar = (c: CuentaDinero) => {
    setEditingCuenta(c);
    setNombreNueva(c.nombre);
    setTipoNueva(c.tipo);
    setSaldoInicialNueva(c.saldoActual || 0);
    setEsPredPOS(!!c.esPredeterminadaPOS);
    setEsPredQR(!!c.esPredeterminadaQR);
    const sucId = typeof c.sucursalId === "object" && c.sucursalId !== null
      ? (c.sucursalId as unknown as { _id: string })._id
      : c.sucursalId || "";
    setSucursalIdNueva(sucId);
    setModalCuentaOpen(true);
  };

  const handleToggleActiva = async (c: CuentaDinero) => {
    try {
      const res = await fetch(`/api/admin/finanzas/cuentas/${c._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !c.activa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error al modificar estado");
      toast.success(`Cuenta ${!c.activa ? "activada" : "desactivada"} correctamente`);
      await cargarCuentas();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al modificar estado");
    }
  };

  const abrirMovimientos = async (cuenta: CuentaDinero) => {
    setCuentaSeleccionada(cuenta);
    setLoadingMovs(true);
    try {
      const res = await fetch(`/api/admin/finanzas/cuentas/${cuenta._id}/movimientos`);
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data);
      } else {
        toast.error("No se pudieron cargar los movimientos");
      }
    } catch {
      toast.error("Error al cargar movimientos");
    } finally {
      setLoadingMovs(false);
    }
  };

  const handleCrearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNueva.trim()) {
      toast.error("El nombre de la cuenta es obligatorio");
      return;
    }

    try {
      setSubmitting(true);
      if (editingCuenta) {
        const res = await fetch(`/api/admin/finanzas/cuentas/${editingCuenta._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombreNueva.trim(),
            tipo: tipoNueva,
            sucursalId: sucursalIdNueva || null,
            esPredeterminadaPOS: esPredPOS,
            esPredeterminadaQR: esPredQR,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Error al actualizar cuenta");
        toast.success("Cuenta actualizada exitosamente");
      } else {
        const res = await fetch("/api/admin/finanzas/cuentas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombreNueva.trim(),
            tipo: tipoNueva,
            saldoInicial: saldoInicialNueva,
            sucursalId: sucursalIdNueva || undefined,
            esPredeterminadaPOS: esPredPOS,
            esPredeterminadaQR: esPredQR,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Error al crear cuenta");
        toast.success("Cuenta creada exitosamente");
      }

      setModalCuentaOpen(false);
      setEditingCuenta(null);
      setNombreNueva("");
      setSaldoInicialNueva(0);
      setEsPredPOS(false);
      setEsPredQR(false);
      setSucursalIdNueva("");
      await cargarCuentas();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origenId || !destinoId) {
      toast.error("Selecciona cuenta origen y destino");
      return;
    }
    if (origenId === destinoId) {
      toast.error("La cuenta origen y destino no pueden ser la misma");
      return;
    }
    if (montoTransf <= 0) {
      toast.error("El monto a transferir debe ser mayor a 0");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/finanzas/transferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origenId,
          destinoId,
          monto: montoTransf,
          concepto: conceptoTransf.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error al transferir");

      toast.success("Transferencia realizada con éxito");
      setModalTransfOpen(false);
      setMontoTransf(0);
      setConceptoTransf("");
      await cargarCuentas();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al transferir");
    } finally {
      setSubmitting(false);
    }
  };

  const totalDineroGeneral = cuentas.reduce((acc, c) => acc + (c.saldoActual || 0), 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Tesorería & Cuentas de Dinero
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            Control de Caja Chica de tiendas, almacenes, cuentas bancarias y billeteras QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModalTransfOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 px-4 py-2.5 text-xs sm:text-sm font-bold text-cyan-300 transition shadow-lg"
          >
            <span>⇄</span> Transferir Fondos
          </button>
          <button
            type="button"
            onClick={handleOpenCrear}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-lg shadow-blue-900/30"
          >
            <span>+</span> Nueva Cuenta
          </button>
        </div>
      </div>

      {/* KPI Global */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Liquidez en Cuentas y Cajas
            </p>
            <p className="mt-1 text-3xl sm:text-4xl font-black text-white">
              Bs {totalDineroGeneral.toFixed(2)}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300">
              {cuentas.length} Cuentas configuradas
            </span>
          </div>
        </div>
      </div>

      {/* Tarjetas de Cuentas */}
      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">Cargando tesorería...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cuentas.map((c) => {
            const sucObj = c.sucursalId as unknown as { nombre?: string; codigo?: string } | undefined;
            const esCaja = c.tipo === "CAJA_FISICA";

            return (
              <div
                key={c._id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/80 p-5 transition hover:border-cyan-500/50 hover:bg-slate-800/90 shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xl border border-white/10">
                      {esCaja ? "💵" : c.tipo === "BANCO" ? "🏦" : "📱"}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          c.activa
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}
                      >
                        {c.activa ? "Activa" : "Inactiva"}
                      </span>
                      {c.esPredeterminadaPOS && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                          POS Mostrador
                        </span>
                      )}
                      {c.esPredeterminadaQR && (
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                          QR Default
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-white group-hover:text-cyan-300 transition">
                    {c.nombre}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Tipo: <strong className="text-gray-300">{c.tipo}</strong>
                    {sucObj?.nombre ? ` • ${sucObj.nombre}` : ""}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-400">Saldo Disponible</p>
                    <p className="text-xl sm:text-2xl font-black text-white">
                      Bs {(c.saldoActual || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenEditar(c)}
                      className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActiva(c)}
                      className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                        c.activa
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      }`}
                    >
                      {c.activa ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirMovimientos(c)}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
                    >
                      Movimientos →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NUEVA CUENTA */}
      {modalCuentaOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingCuenta ? "Editar Cuenta de Dinero" : "Nueva Cuenta de Dinero / Caja"}
              </h3>
              <button
                type="button"
                onClick={() => setModalCuentaOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCuenta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre de Cuenta *</label>
                <input
                  type="text"
                  required
                  value={nombreNueva}
                  onChange={(e) => setNombreNueva(e.target.value)}
                  placeholder="Ej. Caja Chica Tienda 2, Cuenta BCP..."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tipo de Cuenta</label>
                  <select
                    value={tipoNueva}
                    onChange={(e) => setTipoNueva(e.target.value as TipoCuentaDinero)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="CAJA_FISICA">Caja Efectivo</option>
                    <option value="BANCO">Cuenta Bancaria</option>
                    <option value="BILLETERA_QR">Billetera / QR</option>
                    <option value="PASARELA">Pasarela de Pago</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {editingCuenta ? "Saldo Actual (Bs)" : "Saldo Inicial (Bs)"}
                  </label>
                  <input
                    type="number"
                    disabled={!!editingCuenta}
                    step="0.01"
                    min="0"
                    value={saldoInicialNueva}
                    onChange={(e) => setSaldoInicialNueva(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl border border-white/10 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none ${
                      editingCuenta ? "bg-slate-800/50 opacity-60 cursor-not-allowed" : "bg-slate-800"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Sucursal Asignada (Opcional para cuentas globales)
                </label>
                <select
                  value={sucursalIdNueva}
                  onChange={(e) => setSucursalIdNueva(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">(Sin sucursal / Cuenta Global)</option>
                  {sucursales.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.nombre} ({s.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={esPredPOS}
                    onChange={(e) => setEsPredPOS(e.target.checked)}
                    className="rounded border-white/10 bg-slate-800 text-cyan-500"
                  />
                  <span>Es la caja predeterminada de efectivo para ventas en esta sucursal</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={esPredQR}
                    onChange={(e) => setEsPredQR(e.target.checked)}
                    className="rounded border-white/10 bg-slate-800 text-cyan-500"
                  />
                  <span>Es la cuenta receptora predeterminada para cobros QR / Transferencias</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalCuentaOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : editingCuenta ? "Guardar Cambios" : "Crear Cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERENCIA */}
      {modalTransfOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">Transferencia Entre Cuentas</h3>
              <button
                type="button"
                onClick={() => setModalTransfOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferir} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Cuenta Origen (Sale dinero) *</label>
                <select
                  required
                  value={origenId}
                  onChange={(e) => setOrigenId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Selecciona cuenta origen</option>
                  {cuentas.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nombre} (Saldo: Bs {c.saldoActual.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Cuenta Destino (Entra dinero) *</label>
                <select
                  required
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Selecciona cuenta destino</option>
                  {cuentas
                    .filter((c) => c._id !== origenId)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nombre} (Saldo: Bs {c.saldoActual.toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Monto a Transferir (Bs) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={montoTransf || ""}
                  onChange={(e) => setMontoTransf(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-white font-bold text-base focus:border-cyan-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Concepto / Motivo</label>
                <input
                  type="text"
                  value={conceptoTransf}
                  onChange={(e) => setConceptoTransf(e.target.value)}
                  placeholder="Ej. Depósito de recaudación de tienda al banco..."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalTransfOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  {submitting ? "Transfiriendo..." : "Confirmar Transferencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL HISTORIAL DE MOVIMIENTOS */}
      {cuentaSeleccionada && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-white/15 p-6 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">{cuentaSeleccionada.nombre}</h3>
                <p className="text-xs text-gray-400">
                  Saldo Actual:{" "}
                  <strong className="text-emerald-400 text-sm">
                    Bs {cuentaSeleccionada.saldoActual.toFixed(2)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCuentaSeleccionada(null)}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {loadingMovs ? (
                <div className="p-8 text-center text-xs text-gray-400">Cargando movimientos...</div>
              ) : movimientos.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No hay movimientos registrados en esta cuenta todavía.
                </div>
              ) : (
                movimientos.map((m) => {
                  const esIngreso = m.tipo === "INGRESO";
                  const usr = m.usuarioId as unknown as { nombreCompleto?: string } | undefined;
                  return (
                    <div
                      key={m._id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/60 p-3 hover:bg-slate-800 transition"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              esIngreso
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {m.tipo}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(m.createdAt).toLocaleString("es-BO")}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs font-semibold text-white">
                          {m.concepto}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {m.origenTipo} {usr?.nombreCompleto ? `• Registrado por ${usr.nombreCompleto}` : ""}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-black ${
                            esIngreso ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {esIngreso ? "+" : "-"} Bs {m.monto.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Saldo: Bs {m.saldoPosterior.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
