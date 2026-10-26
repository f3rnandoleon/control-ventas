"use client";

import { useState } from "react";
import type { Traspaso } from "@/types/traspaso";
import type { Producto } from "@/types/producto";
import { toast } from "sonner";
import TraspasoThumb from "./TraspasoThumb";

interface RecibirTraspasoModalProps {
  traspaso: Traspaso | null;
  productosMap?: Record<string, Producto>;
  actionLoading?: boolean;
  onClose: () => void;
  onConfirm: (
    traspasoId: string,
    data?: {
      itemsRecibidos?: Array<{
        varianteId: string;
        cantidadRecibida: number;
      }>;
      notasRecepcion?: string;
    }
  ) => Promise<void>;
}

export default function RecibirTraspasoModal({
  traspaso: t,
  productosMap = {},
  actionLoading = false,
  onClose,
  onConfirm,
}: RecibirTraspasoModalProps) {
  // Cantidades recibidas por varianteId
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    if (!t) return {};
    const map: Record<string, number> = {};
    for (const item of t.items || []) {
      map[item.varianteId] = item.cantidadEnviada;
    }
    return map;
  });

  const [notasRecepcion, setNotasRecepcion] = useState("Recepción conforme sin observaciones");
  const [submitting, setSubmitting] = useState(false);

  if (!t) return null;

  // Resolucion de imagenes y modelos
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

  const handleSetAllConforme = () => {
    const nextMap: Record<string, number> = {};
    for (const item of t.items || []) {
      nextMap[item.varianteId] = item.cantidadEnviada;
    }
    setQuantities(nextMap);
    toast.success("Todas las cantidades marcadas como conformes");
  };

  const totalRecibidas = Object.values(quantities).reduce((a, b) => a + Number(b || 0), 0);
  const totalEnviadas = t.totalPrendasEnviadas;
  const hasDiscrepancy = totalRecibidas !== totalEnviadas;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar cantidades no negativas
    for (const it of t.items) {
      const q = quantities[it.varianteId];
      if (q === undefined || q < 0) {
        toast.error(`Ingresa una cantidad válida para ${it.productoSnapshot?.nombre}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      await onConfirm(t._id, {
        itemsRecibidos: t.items.map((it) => ({
          varianteId: it.varianteId,
          cantidadRecibida: quantities[it.varianteId] ?? it.cantidadEnviada,
        })),
        notasRecepcion: notasRecepcion.trim(),
      });
      toast.success("¡Mercadería ingresada a la sucursal de destino!");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al recibir el traspaso");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Confirmar Recepción de Mercadería
              </h2>
              <p className="text-xs text-slate-400">
                Traspaso <span className="font-mono font-bold text-white">{t.numeroTraspaso}</span> •{" "}
                {totalEnviadas} prendas enviadas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Info Card */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-emerald-200">Ingreso automático al inventario</p>
              <p className="mt-0.5 text-emerald-300/90 leading-relaxed">
                Al confirmar, el stock se sumará físicamente a la sucursal de destino y quedará
                registrado en el Kárdex con su costo unitario CPP intacto.
              </p>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Verificación física de prendas:
            </span>
            <button
              type="button"
              onClick={handleSetAllConforme}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              ✓ Marcar todo conforme
            </button>
          </div>

          {/* Checklist de Items */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-white/10 text-slate-400 uppercase font-semibold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Prenda</th>
                  <th className="px-4 py-3 text-left">Variante</th>
                  <th className="px-4 py-3 text-center">Enviado</th>
                  <th className="px-4 py-3 text-center">Recibido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {itemsResolved.map((it) => {
                  const qtyRec = quantities[it.varianteId] ?? it.cantidadEnviada;
                  const isDiff = qtyRec !== it.cantidadEnviada;

                  return (
                    <tr key={it.varianteId} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <TraspasoThumb
                            src={it.resolvedImage}
                            alt={it.productoSnapshot?.nombre}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-white leading-tight">
                              {it.productoSnapshot?.nombre}
                            </p>
                            {it.resolvedModelo && (
                              <span className="inline-block font-mono text-[9px] text-cyan-300 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/40 mt-0.5">
                                Mod: {it.resolvedModelo}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-200">{it.varianteSnapshot?.color}</span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/10 text-white font-bold text-[10px]">
                          {it.varianteSnapshot?.talla}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-white">
                        {it.cantidadEnviada} un.
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={it.cantidadEnviada * 2}
                            value={qtyRec}
                            onChange={(e) =>
                              setQuantities({
                                ...quantities,
                                [it.varianteId]: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className={`w-14 text-center py-1.5 rounded-lg border font-bold text-xs focus:outline-none ${
                              isDiff
                                ? "border-amber-500 bg-amber-500/20 text-amber-200"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">un.</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Warning de discrepancia si hay */}
          {hasDiscrepancy && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                Atención: Hay una diferencia entre lo enviado ({totalEnviadas} un.) y lo que estás
                recibiendo ({totalRecibidas} un.). Asegúrate de detallar el motivo abajo.
              </span>
            </div>
          )}

          {/* Notas de recepcion */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Observaciones de Recepción / Estado del Paquete
            </label>
            <textarea
              rows={2}
              value={notasRecepcion}
              onChange={(e) => setNotasRecepcion(e.target.value)}
              placeholder="Indica si todo llegó sellado, en buen estado o si hubo alguna prenda faltante/dañada..."
              className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Total a recibir:{" "}
              <strong className="text-white font-bold">{totalRecibidas} prendas</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting || actionLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span>Procesando Ingreso...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Confirmar Ingreso a Sucursal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
