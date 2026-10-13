"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { SesionCaja } from "@/types/sesionCaja";

interface CajaPosWidgetProps {
  onCajaStatusChange?: (abierta: boolean) => void;
}

export default function CajaPosWidget({ onCajaStatusChange }: CajaPosWidgetProps) {
  const [sesionActiva, setSesionActiva] = useState<SesionCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAperturaOpen, setModalAperturaOpen] = useState(false);
  const [modalCierreOpen, setModalCierreOpen] = useState(false);
  const [modalMovimientoOpen, setModalMovimientoOpen] = useState(false);

  // Form states apertura
  const [montoApertura, setMontoApertura] = useState<number>(0);
  const [obsApertura, setObsApertura] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states cierre
  const [montoRealEfectivo, setMontoRealEfectivo] = useState<number>(0);
  const [obsCierre, setObsCierre] = useState<string>("");

  // Form states movimiento manual
  const [tipoMov, setTipoMov] = useState<"INGRESO_MANUAL" | "EGRESO_MANUAL">("EGRESO_MANUAL");
  const [montoMov, setMontoMov] = useState<number>(0);
  const [conceptoMov, setConceptoMov] = useState<string>("");

  const cargarSesionActiva = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pos/caja/activa");
      if (res.ok) {
        const data = await res.json();
        setSesionActiva(data);
        onCajaStatusChange?.(Boolean(data));
      } else {
        setSesionActiva(null);
        onCajaStatusChange?.(false);
      }
    } catch {
      setSesionActiva(null);
      onCajaStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [onCajaStatusChange]);

  useEffect(() => {
    cargarSesionActiva();
  }, [cargarSesionActiva]);

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoApertura < 0) {
      toast.error("El monto de apertura no puede ser negativo");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/pos/caja/apertura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoApertura,
          observacionesApertura: obsApertura,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Error al abrir caja");
      }

      toast.success("¡Caja abierta exitosamente! Ya puedes procesar ventas.");
      setModalAperturaOpen(false);
      setMontoApertura(0);
      setObsApertura("");
      await cargarSesionActiva();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al abrir caja";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/pos/caja/cierre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoRealEfectivo,
          observacionesCierre: obsCierre,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Error al cerrar caja");
      }

      toast.success(`Caja cerrada correctamente. Sesión finalizada.`);
      setModalCierreOpen(false);
      setMontoRealEfectivo(0);
      setObsCierre("");
      await cargarSesionActiva();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cerrar caja";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoMov <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    if (!conceptoMov.trim()) {
      toast.error("Ingresa un motivo o concepto");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/pos/caja/movimiento-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoMov,
          monto: montoMov,
          concepto: conceptoMov,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Error al registrar movimiento");
      }

      toast.success("Movimiento registrado en caja");
      setModalMovimientoOpen(false);
      setMontoMov(0);
      setConceptoMov("");
      await cargarSesionActiva();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar movimiento";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs text-gray-400">
        <span>Verificando estado de caja física...</span>
      </div>
    );
  }

  // CUANDO NO HAY CAJA ABIERTA (Alerta Obligatoria)
  if (!sesionActiva) {
    return (
      <>
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900/60 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-xl text-amber-400 border border-amber-500/30">
              ⚠️
            </span>
            <div>
              <p className="font-bold text-amber-200 text-sm sm:text-base">
                Apertura de Caja Requerida para Ventas
              </p>
              <p className="text-xs text-amber-300/80">
                Debes abrir la caja física de esta sucursal (Caja Chica Tienda 1) con tu saldo inicial para empezar a cobrar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalAperturaOpen(true)}
            className="w-full sm:w-auto shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110 active:scale-95"
          >
            Abrir Caja Diaria
          </button>
        </div>

        {/* MODAL DE APERTURA */}
        {modalAperturaOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🏪</span> Apertura de Caja Diaria
                </h3>
                <button
                  type="button"
                  onClick={() => setModalAperturaOpen(false)}
                  className="text-gray-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAbrirCaja} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Monto de Apertura (Saldo Inicial en Gaveta) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">Bs</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={montoApertura}
                      onChange={(e) => setMontoApertura(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-10 pr-3 py-2 text-white font-bold text-lg focus:border-amber-400 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Ingresa el cambio o fondo con el que inicia la jornada (o 0 si no hay fondo previo).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Observaciones (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={obsApertura}
                    onChange={(e) => setObsApertura(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/80 p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="Ej. Billetes de 20 y monedas para cambio..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalAperturaOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {isSubmitting ? "Abriendo..." : "Confirmar Apertura"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // CUANDO SÍ HAY CAJA ABIERTA (Barra de Control POS)
  const totalEsperadoEfectivo =
    sesionActiva.montoEsperadoEfectivo ??
    ((sesionActiva.montoApertura || 0) +
      (sesionActiva.totalVentasEfectivo || 0) +
      (sesionActiva.totalIngresosManuales || 0) -
      (sesionActiva.totalEgresosManuales || 0));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 p-3 sm:p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs sm:text-sm">
                Caja Activa #{sesionActiva._id.slice(-6).toUpperCase()}
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                ABIERTA
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Fondo inicial: <strong className="text-gray-200">Bs {sesionActiva.montoApertura.toFixed(2)}</strong> |
              Ventas: <strong className="text-emerald-300">Bs {(sesionActiva.totalVentasEfectivo + sesionActiva.totalVentasQR).toFixed(2)}</strong> |
              Efectivo en gaveta estimado: <strong className="text-white">Bs {totalEsperadoEfectivo.toFixed(2)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalMovimientoOpen(true)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
          >
            ± Movimiento
          </button>
          <button
            type="button"
            onClick={() => {
              setMontoRealEfectivo(totalEsperadoEfectivo);
              setModalCierreOpen(true);
            }}
            className="rounded-xl bg-rose-600/80 hover:bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md transition"
          >
            Arqueo / Cerrar Caja
          </button>
        </div>
      </div>

      {/* MODAL DE MOVIMIENTO MANUAL */}
      {modalMovimientoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Registrar Movimiento en Caja</h3>
              <button
                type="button"
                onClick={() => setModalMovimientoOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegistrarMovimiento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Tipo de Operación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoMov("EGRESO_MANUAL")}
                    className={`rounded-xl p-2 text-xs font-bold border transition ${
                      tipoMov === "EGRESO_MANUAL"
                        ? "bg-rose-600/30 border-rose-500 text-rose-200"
                        : "bg-slate-800 border-white/10 text-gray-400"
                    }`}
                  >
                    Egreso (Salida / Gasto menor)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMov("INGRESO_MANUAL")}
                    className={`rounded-xl p-2 text-xs font-bold border transition ${
                      tipoMov === "INGRESO_MANUAL"
                        ? "bg-emerald-600/30 border-emerald-500 text-emerald-200"
                        : "bg-slate-800 border-white/10 text-gray-400"
                    }`}
                  >
                    Ingreso (Aporte adicional)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Monto (Bs) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  required
                  value={montoMov || ""}
                  onChange={(e) => setMontoMov(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-white font-bold text-base focus:border-cyan-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Concepto / Motivo *</label>
                <input
                  type="text"
                  required
                  value={conceptoMov}
                  onChange={(e) => setConceptoMov(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  placeholder="Ej. Compra de bolsas / Pago flete moto..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalMovimientoOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Registrando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CIERRE / ARQUEO */}
      {modalCierreOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔒</span> Arqueo y Cierre de Caja
              </h3>
              <button
                type="button"
                onClick={() => setModalCierreOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-800/80 p-3 text-xs">
              <div>
                <p className="text-gray-400">Fondo Inicial:</p>
                <p className="font-bold text-white">Bs {sesionActiva.montoApertura.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Ventas Efectivo:</p>
                <p className="font-bold text-emerald-300">Bs {sesionActiva.totalVentasEfectivo.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Ventas QR / Banco:</p>
                <p className="font-bold text-cyan-300">Bs {sesionActiva.totalVentasQR.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Efectivo Sistema Esperado:</p>
                <p className="font-bold text-amber-300 text-sm">Bs {totalEsperadoEfectivo.toFixed(2)}</p>
              </div>
            </div>

            <form onSubmit={handleCerrarCaja} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Efectivo Real Contado en Gaveta (Arqueo Físico) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">Bs</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={montoRealEfectivo}
                    onChange={(e) => setMontoRealEfectivo(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 pl-10 pr-3 py-2 text-white font-bold text-lg focus:border-rose-400 focus:outline-none"
                  />
                </div>

                {/* Diferencia calculada */}
                {(() => {
                  const dif = montoRealEfectivo - totalEsperadoEfectivo;
                  if (Math.abs(dif) < 0.01) {
                    return (
                      <p className="mt-1.5 text-xs font-bold text-emerald-400 flex items-center gap-1">
                        ✓ Caja cuadrada exactamente sin diferencias.
                      </p>
                    );
                  }
                  if (dif > 0) {
                    return (
                      <p className="mt-1.5 text-xs font-bold text-cyan-400 flex items-center gap-1">
                        + Sobrante de efectivo: Bs {dif.toFixed(2)}
                      </p>
                    );
                  }
                  return (
                    <p className="mt-1.5 text-xs font-bold text-rose-400 flex items-center gap-1">
                      ⚠️ Faltante de efectivo: Bs {Math.abs(dif).toFixed(2)}
                    </p>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Observaciones de Cierre (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={obsCierre}
                  onChange={(e) => setObsCierre(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                  placeholder="Detalles del recuento, entrega a supervisor..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalCierreOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 shadow-lg shadow-rose-900/30"
                >
                  {isSubmitting ? "Cerrando..." : "Confirmar Cierre de Caja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
