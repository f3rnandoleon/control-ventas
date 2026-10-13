"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Compra, CompraItem } from "@/types/compra";
import { formatMoney } from "@/utils/pricing";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { anularCompra } from "@/services/compras.service";

export default function ComprasTable({
  compras,
  loading,
  onRefresh,
}: {
  compras: Compra[];
  loading: boolean;
  onRefresh?: () => void;
}) {
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [anulando, setAnulando] = useState(false);

  const handleAnular = async (compra: Compra) => {
    const motivo = window.prompt(
      `¿Estás seguro de anular la compra ${compra.numeroCompra}?\nSe descontará el stock reabastecido y se reembolsará el dinero a la cuenta.\n\nIngresa el motivo de anulación:`
    );
    if (!motivo) return;

    try {
      setAnulando(true);
      await anularCompra(compra._id, motivo);
      toast.success("Compra anulada exitosamente. Stock y dinero revertidos.");
      setSelectedCompra(null);
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al anular compra");
    } finally {
      setAnulando(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (compras.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-gray-400">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-lg font-medium text-gray-200">
          No hay registros de compras
        </p>
        <p className="text-sm mt-1">
          Utiliza el botón de &quot;Nueva Compra&quot; para registrar reabastecimientos de mercadería con Costo Promedio Ponderado.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_20px_rgba(0,180,255,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Nº Compra</th>
                <th className="px-5 py-3.5 text-left">Fecha</th>
                <th className="px-5 py-3.5 text-left">Proveedor / Ref</th>
                <th className="px-5 py-3.5 text-center">Moneda & TC</th>
                <th className="px-5 py-3.5 text-center">Prendas</th>
                <th className="px-5 py-3.5 text-right">Total Invertido</th>
                <th className="px-5 py-3.5 text-center">Estado</th>
                <th className="px-5 py-3.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {compras.map((compra) => {
                const totalPrendas = compra.items.reduce(
                  (acc, item) => acc + item.cantidad,
                  0
                );
                const fechaStr = new Date(compra.fecha).toLocaleDateString(
                  "es-BO",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                );

                return (
                  <tr
                    key={compra._id}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-semibold text-cyan-400">
                      {compra.numeroCompra}
                    </td>
                    <td className="px-5 py-4 text-gray-300">{fechaStr}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-100">
                        {compra.proveedor || "Sin proveedor"}
                      </div>
                      {compra.comprobanteReferencia && (
                        <div className="text-xs text-gray-400">
                          {compra.comprobanteReferencia}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {compra.monedaOrigen === "PEN" && "🇵🇪 PEN"}
                        {compra.monedaOrigen === "BOB" && "🇧🇴 BOB"}
                        {compra.monedaOrigen === "USD" && "💵 USD"}
                        {compra.monedaOrigen !== "BOB" && (
                          <span className="text-[10px] text-gray-400">
                            (TC: {compra.tipoCambio})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-gray-200">
                      {totalPrendas} u.
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-bold text-emerald-400">
                        {formatMoney(compra.totalBOB)}
                      </div>
                      {compra.monedaOrigen !== "BOB" && (
                        <div className="text-xs text-gray-400">
                          {compra.monedaOrigen} {compra.totalMonedaOrigen.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          compra.estado === "ANULADA"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {compra.estado === "ANULADA" ? "ANULADA" : "COMPLETADA"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedCompra(compra)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE DE COMPRA */}
      {selectedCompra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-gray-900 border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-900/80">
              <div>
                <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                  <span>Detalle de Compra:</span>
                  <span className="font-mono text-white">
                    {selectedCompra.numeroCompra}
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Fecha:{" "}
                  {new Date(selectedCompra.fecha).toLocaleString("es-BO")} |{" "}
                  Proveedor: {selectedCompra.proveedor || "No especificado"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompra(null)}
                className="text-gray-400 hover:text-white text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {selectedCompra.estado === "ANULADA" && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <span>⚠️</span> Esta compra fue ANULADA
                  </div>
                  <p className="text-[11px] text-rose-400">
                    El stock añadido fue revertido y los egresos monetarios fueron reintegrados a la cuenta.
                  </p>
                  {selectedCompra.motivoAnulacion && (
                    <p className="text-[11px] text-slate-300 italic pt-1">
                      Motivo: &quot;{selectedCompra.motivoAnulacion}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Tarjetas de Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-400">Moneda & TC</span>
                  <p className="text-sm font-semibold text-white mt-1">
                    {selectedCompra.monedaOrigen} (TC: {selectedCompra.tipoCambio})
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-400">Total Moneda Origen</span>
                  <p className="text-sm font-semibold text-white mt-1">
                    {selectedCompra.monedaOrigen}{" "}
                    {selectedCompra.totalMonedaOrigen.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-400">Total en Bolivianos</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">
                    {formatMoney(selectedCompra.totalBOB)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-400">Ítems / Modelos</span>
                  <p className="text-sm font-semibold text-white mt-1">
                    {selectedCompra.items.length} variantes
                  </p>
                </div>
              </div>

              {selectedCompra.notas && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                  <span className="font-semibold">Notas:</span>{" "}
                  {selectedCompra.notas}
                </div>
              )}

              {/* Tabla de ítems con impacto CPP */}
              <div>
                <h4 className="text-sm font-bold text-gray-200 mb-3 uppercase tracking-wider">
                  Prendas Reabastecidas y Cálculo de CPP
                </h4>
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <table className="w-full text-xs text-gray-300">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                      <tr>
                        <th className="px-3.5 py-2.5 text-center">Imagen</th>
                        <th className="px-3.5 py-2.5 text-left">Producto / Modelo</th>
                        <th className="px-3.5 py-2.5 text-left">Variante</th>
                        <th className="px-3.5 py-2.5 text-center">Cant.</th>
                        <th className="px-3.5 py-2.5 text-right">Costo Compra</th>
                        <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                        <th className="px-3.5 py-2.5 text-center bg-cyan-950/40 text-cyan-300">
                          Stock Previo ➔ Nuevo
                        </th>
                        <th className="px-3.5 py-2.5 text-right bg-cyan-950/40 text-cyan-300">
                          Costo Previo ➔ Nuevo CPP
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedCompra.items.map((item: CompraItem, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2.5 text-center">
                            {item.varianteSnapshot.imagen ? (
                              <CloudinaryImage
                                src={item.varianteSnapshot.imagen}
                                alt={`${item.varianteSnapshot.color} - ${item.varianteSnapshot.talla}`}
                                width={44}
                                height={44}
                                className="w-11 h-11 rounded-lg object-cover border border-white/20 mx-auto"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base mx-auto">
                                👕
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 font-medium text-white">
                            <div>{item.productoSnapshot.nombre}</div>
                            {item.productoSnapshot.modelo && (
                              <div className="text-[11px] text-gray-400">
                                Mod: {item.productoSnapshot.modelo}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            <span className="inline-flex items-center gap-1 font-medium text-cyan-300">
                              {item.varianteSnapshot.color}
                              {item.varianteSnapshot.colorSecundario &&
                                ` / ${item.varianteSnapshot.colorSecundario}`}{" "}
                              - Talla {item.varianteSnapshot.talla}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-center font-bold text-white">
                            +{item.cantidad}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            <div>{formatMoney(item.costoUnitarioBOB)}</div>
                            {selectedCompra.monedaOrigen !== "BOB" && (
                              <div className="text-[10px] text-gray-400">
                                {selectedCompra.monedaOrigen}{" "}
                                {item.costoUnitarioOrigen.toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right font-medium text-emerald-400">
                            {formatMoney(item.totalLineaBOB)}
                          </td>
                          <td className="px-3.5 py-3 text-center bg-cyan-950/20 font-mono text-cyan-200">
                            {item.stockAnterior} u. ➔{" "}
                            <span className="font-bold">{item.nuevoStock} u.</span>
                          </td>
                          <td className="px-3.5 py-3 text-right bg-cyan-950/20 font-mono">
                            <span className="text-gray-400">
                              {formatMoney(item.costoAnteriorBOB)}
                            </span>{" "}
                            ➔{" "}
                            <span className="font-bold text-cyan-300">
                              {formatMoney(item.nuevoCostoPromedioBOB)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-gray-900/80 flex items-center justify-between">
              <div>
                {selectedCompra.estado !== "ANULADA" && (
                  <button
                    type="button"
                    disabled={anulando}
                    onClick={() => handleAnular(selectedCompra)}
                    className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition disabled:opacity-50"
                  >
                    {anulando ? "Anulando..." : "🗑️ Anular Compra"}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompra(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
