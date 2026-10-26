"use client";

import { useState } from "react";
import type { Traspaso } from "@/types/traspaso";
import type { Sucursal } from "@/types/sucursal";
import type { Producto } from "@/types/producto";
import { formatMoney } from "@/utils/pricing";
import TraspasoStatusBadge from "./TraspasoStatusBadge";
import TraspasoThumb from "./TraspasoThumb";

interface DetalleTraspasoModalProps {
  traspaso: Traspaso | null;
  productosMap?: Record<string, Producto>;
  actionLoading?: boolean;
  onClose: () => void;
  onDespachar?: (id: string) => void;
  onRecibir?: (traspaso: Traspaso) => void;
  onCancelar?: (id: string) => void;
  onPrint?: (traspaso: Traspaso) => void;
}

export default function DetalleTraspasoModal({
  traspaso: t,
  productosMap = {},
  actionLoading = false,
  onClose,
  onDespachar,
  onRecibir,
  onCancelar,
  onPrint,
}: DetalleTraspasoModalProps) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  if (!t) return null;

  const origen =
    typeof t.sucursalOrigenId === "object"
      ? (t.sucursalOrigenId as unknown as Sucursal)
      : null;

  const destino =
    typeof t.sucursalDestinoId === "object"
      ? (t.sucursalDestinoId as unknown as Sucursal)
      : null;

  const solicitante =
    typeof t.solicitadoPor === "object" && t.solicitadoPor !== null
      ? t.solicitadoPor
      : null;

  const despachador =
    typeof t.despachadoPor === "object" && t.despachadoPor !== null
      ? t.despachadoPor
      : null;

  const recibidor =
    typeof t.recibidoPor === "object" && t.recibidoPor !== null
      ? t.recibidoPor
      : null;

  // Items enriquecidos con imagenes y modelo fallback
  const itemsEnriquecidos = (t.items || []).map((it) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/40">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-mono font-bold text-white tracking-wide">
                  {t.numeroTraspaso}
                </h2>
                <TraspasoStatusBadge estado={t.estado} size="sm" />
              </div>
              <p className="text-xs text-slate-400">
                Creado el{" "}
                {t.createdAt
                  ? new Date(t.createdAt).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                onClick={() => onPrint(t)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="hidden sm:inline">Imprimir Guía</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Visual Stepper Timeline */}
          <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Línea de Vida del Movimiento
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
              {/* Paso 1: Solicitado */}
              <div
                className={`p-3 rounded-xl border transition ${
                  t.estado !== "CANCELADA"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border-white/10 bg-white/[0.02] text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <span className="font-semibold text-xs text-white">Solicitado</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {solicitante ? solicitante.nombreCompleto : "Usuario del sistema"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                </p>
              </div>

              {/* Paso 2: Despachado */}
              <div
                className={`p-3 rounded-xl border transition ${
                  t.estado === "EN_TRANSITO" || t.estado === "RECIBIDA"
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border-white/10 bg-white/[0.02] text-slate-500 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <span className="font-semibold text-xs text-white">Despachado / Tránsito</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {despachador ? despachador.nombreCompleto : "Pendiente de despacho"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t.fechaDespacho ? new Date(t.fechaDespacho).toLocaleDateString() : "-"}
                </p>
              </div>

              {/* Paso 3: Recibido */}
              <div
                className={`p-3 rounded-xl border transition ${
                  t.estado === "RECIBIDA"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.02] text-slate-500 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <span className="font-semibold text-xs text-white">Ingresado a Destino</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {recibidor ? recibidor.nombreCompleto : "Pendiente de recepción"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t.fechaRecepcion ? new Date(t.fechaRecepcion).toLocaleDateString() : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Ruta: Origen ➔ Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-400 block tracking-wider">
                Sucursal Origen (Salida de Stock)
              </span>
              <p className="text-base font-bold text-white">
                {origen?.nombre || "Origen"}
                {origen?.codigo ? ` (${origen.codigo})` : ""}
              </p>
              {origen?.direccion && (
                <p className="text-xs text-slate-400">{origen.direccion}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                Sucursal Destino (Recepción)
              </span>
              <p className="text-base font-bold text-white">
                {destino?.nombre || "Destino"}
                {destino?.codigo ? ` (${destino.codigo})` : ""}
              </p>
              {destino?.direccion && (
                <p className="text-xs text-slate-400">{destino.direccion}</p>
              )}
            </div>
          </div>

          {/* Motivo & Notas */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Motivo del Movimiento
              </span>
              <p className="text-slate-200">{t.motivo || "No especificado"}</p>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Notas de Envío / Instrucciones
              </span>
              <p className="text-slate-200">{t.notas || "Sin instrucciones adicionales"}</p>
            </div>
          </div>

          {/* Detalle de Prendas Transferidas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Prendas en el Traspaso ({itemsEnriquecidos.length})
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">
                  Total enviado:{" "}
                  <strong className="text-white font-bold">{t.totalPrendasEnviadas} un.</strong>
                </span>
                <span className="text-slate-400">
                  Valor Costo:{" "}
                  <strong className="text-cyan-300 font-mono font-bold">
                    {formatMoney(t.valorTotalCostoTraspaso)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-300">
                  <thead className="bg-slate-950/70 border-b border-white/10 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Prenda & Modelo</th>
                      <th className="px-4 py-3 text-left">Variante</th>
                      <th className="px-4 py-3 text-right">Costo Unit. CPP</th>
                      <th className="px-4 py-3 text-center">Enviado</th>
                      <th className="px-4 py-3 text-center">Recibido</th>
                      <th className="px-4 py-3 text-right">Subtotal CPP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {itemsEnriquecidos.map((it, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        {/* Prenda & Modelo */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <TraspasoThumb
                              src={it.resolvedImage}
                              alt={it.productoSnapshot?.nombre}
                              size="md"
                              onClick={() => it.resolvedImage && setZoomImage(it.resolvedImage)}
                            />
                            <div>
                              <p className="font-bold text-white text-sm leading-tight">
                                {it.productoSnapshot?.nombre || "Producto"}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {it.resolvedModelo && (
                                  <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/70 px-1.5 py-0.2 rounded border border-cyan-800/40 font-semibold">
                                    Mod: {it.resolvedModelo}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-slate-400">
                                  SKU: {it.productoSnapshot?.sku || "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Variante */}
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-200">
                            {it.varianteSnapshot?.color}
                            {it.varianteSnapshot?.colorSecundario
                              ? ` / ${it.varianteSnapshot.colorSecundario}`
                              : ""}
                          </span>
                          <span className="ml-2 px-2 py-0.5 rounded-md bg-white/10 text-white font-bold text-[11px]">
                            {it.varianteSnapshot?.talla}
                          </span>
                          {it.varianteSnapshot?.codigoBarra && (
                            <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                              CB: {it.varianteSnapshot.codigoBarra}
                            </span>
                          )}
                        </td>

                        {/* Costo Unitario */}
                        <td className="px-4 py-3 text-right text-slate-400 font-mono">
                          {formatMoney(it.costoUnitarioCPP)}
                        </td>

                        {/* Cantidad Enviada */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-lg bg-white/10 font-bold text-white">
                            {it.cantidadEnviada} un.
                          </span>
                        </td>

                        {/* Cantidad Recibida */}
                        <td className="px-4 py-3 text-center">
                          {t.estado === "RECIBIDA" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                              {it.cantidadRecibida ?? it.cantidadEnviada} un.
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Subtotal */}
                        <td className="px-4 py-3 text-right font-bold text-cyan-300 font-mono">
                          {formatMoney(it.cantidadEnviada * it.costoUnitarioCPP)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer sticky con acciones context */}
        <div className="px-5 py-4 border-t border-white/10 bg-slate-950 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
          <div className="flex items-center gap-2">
            {t.estado === "SOLICITADA" && onCancelar && (
              <button
                disabled={actionLoading}
                onClick={() => onCancelar(t._id)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
              >
                Cancelar Transferencia
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition cursor-pointer"
            >
              Cerrar
            </button>

            {/* Despachar */}
            {t.estado === "SOLICITADA" && onDespachar && (
              <button
                disabled={actionLoading}
                onClick={() => onDespachar(t._id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-950/40 transition cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 9h11v8H3V9zm11 3h4l3 3v2h-7v-5z" />
                </svg>
                <span>Despachar Mercadería</span>
              </button>
            )}

            {/* Recibir */}
            {t.estado === "EN_TRANSITO" && onRecibir && (
              <button
                disabled={actionLoading}
                onClick={() => onRecibir(t)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Recibir en Tienda</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Zoom Image Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg cursor-zoom-out"
        >
          <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImage}
              alt="Zoom prenda"
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
