"use client";

import type { Traspaso } from "@/types/traspaso";
import type { Sucursal } from "@/types/sucursal";
import type { Producto } from "@/types/producto";
import { formatMoney } from "@/utils/pricing";
import TraspasoStatusBadge from "./TraspasoStatusBadge";
import TraspasoThumb from "./TraspasoThumb";

interface TraspasoCardProps {
  traspaso: Traspaso;
  productosMap?: Record<string, Producto>;
  actionLoading?: boolean;
  onView: (traspaso: Traspaso) => void;
  onDespachar?: (id: string) => void;
  onRecibir?: (traspaso: Traspaso) => void;
  onCancelar?: (id: string) => void;
  onPrint?: (traspaso: Traspaso) => void;
}

export default function TraspasoCard({
  traspaso: t,
  productosMap = {},
  actionLoading = false,
  onView,
  onDespachar,
  onRecibir,
  onCancelar,
  onPrint,
}: TraspasoCardProps) {
  const origen =
    typeof t.sucursalOrigenId === "object"
      ? (t.sucursalOrigenId as unknown as Sucursal).nombre
      : "Origen";
  const origenCod =
    typeof t.sucursalOrigenId === "object"
      ? (t.sucursalOrigenId as unknown as Sucursal).codigo
      : "";

  const destino =
    typeof t.sucursalDestinoId === "object"
      ? (t.sucursalDestinoId as unknown as Sucursal).nombre
      : "Destino";
  const destinoCod =
    typeof t.sucursalDestinoId === "object"
      ? (t.sucursalDestinoId as unknown as Sucursal).codigo
      : "";

  const solicitante =
    typeof t.solicitadoPor === "object" && t.solicitadoPor !== null
      ? t.solicitadoPor.nombreCompleto
      : null;

  // Resolucion de imagen y modelo
  const itemsWithImages = (t.items || []).map((it) => {
    const liveProd = productosMap[it.productoId];
    const liveVariant = liveProd?.variantes?.find((v) => v.varianteId === it.varianteId);
    const resolvedImage =
      it.varianteSnapshot?.imagen ||
      liveVariant?.imagenes?.[0] ||
      (liveVariant as Record<string, unknown> | undefined)?.imagen as string ||
      liveProd?.variantes?.find((v) => (v.imagenes && v.imagenes.length > 0))?.imagenes?.[0] ||
      null;

    const resolvedModelo =
      it.productoSnapshot?.modelo || liveProd?.modelo || "";

    return {
      ...it,
      resolvedImage,
      resolvedModelo,
    };
  });

  const previewItems = itemsWithImages.slice(0, 4);
  const remainingCount = itemsWithImages.length - 4;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 shadow-xl hover:border-cyan-500/30 transition-all space-y-4">
      {/* Top Bar: Code, Date & Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white text-base tracking-wide">
              {t.numeroTraspaso}
            </span>
            {t.estado === "EN_TRANSITO" && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {t.createdAt
              ? new Date(t.createdAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
            {solicitante ? ` • Por ${solicitante}` : ""}
          </p>
        </div>

        <TraspasoStatusBadge estado={t.estado} size="sm" />
      </div>

      {/* Route Badge */}
      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase font-bold text-purple-400 block tracking-wider">
            Origen
          </span>
          <p className="font-semibold text-white truncate">{origen}</p>
          {origenCod && <span className="text-[10px] text-slate-500 font-mono">[{origenCod}]</span>}
        </div>

        <div className="flex flex-col items-center justify-center px-1 text-slate-500">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>

        <div className="min-w-0 flex-1 text-right">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
            Destino
          </span>
          <p className="font-semibold text-white truncate">{destino}</p>
          {destinoCod && <span className="text-[10px] text-slate-500 font-mono">[{destinoCod}]</span>}
        </div>
      </div>

      {/* Items Preview with Thumbnails and Models */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Prendas en el traspaso:</span>
          <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg text-[11px]">
            {t.totalPrendasEnviadas} un.
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
          {previewItems.map((it, idx) => (
            <div
              key={idx}
              className="group relative flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.04] border border-white/5 hover:border-white/15 transition shrink-0"
              title={`${it.productoSnapshot?.nombre} (${it.varianteSnapshot?.color} / ${it.varianteSnapshot?.talla})`}
            >
              <TraspasoThumb
                src={it.resolvedImage}
                alt={it.productoSnapshot?.nombre}
                size="sm"
              />
              <div className="pr-1 text-left">
                <p className="text-[11px] font-semibold text-white max-w-[110px] truncate leading-tight">
                  {it.productoSnapshot?.nombre}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {it.resolvedModelo && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {it.resolvedModelo}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400">
                    {it.varianteSnapshot?.color}/{it.varianteSnapshot?.talla}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {remainingCount > 0 && (
            <div className="shrink-0 h-10 px-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold text-slate-300">
              +{remainingCount} más
            </div>
          )}
        </div>
      </div>

      {/* Motivo & Notes (if any) */}
      {t.motivo && (
        <div className="text-xs text-slate-400 line-clamp-1 bg-white/[0.02] px-2.5 py-1.5 rounded-lg border border-white/5">
          <span className="font-medium text-slate-300">Motivo:</span> {t.motivo}
        </div>
      )}

      {/* Metrics Row */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Valor Costo (CPP)
          </span>
          <span className="font-bold text-cyan-300 text-sm">
            {formatMoney(t.valorTotalCostoTraspaso)}
          </span>
        </div>

        {t.estado === "RECIBIDA" && t.totalPrendasRecibidas !== undefined && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-500 block">
              Prendas Recibidas
            </span>
            <span className="font-bold text-emerald-300 text-sm">
              {t.totalPrendasRecibidas} / {t.totalPrendasEnviadas} un.
            </span>
          </div>
        )}
      </div>

      {/* Touch-Friendly Action Buttons */}
      <div className="pt-2 flex flex-wrap items-center gap-2">
        {/* Primary Context Action */}
        {t.estado === "SOLICITADA" && onDespachar && (
          <button
            disabled={actionLoading}
            onClick={() => onDespachar(t._id)}
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-950/40 transition active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 9h11v8H3V9zm11 3h4l3 3v2h-7v-5z" />
            </svg>
            <span>Despachar Mercadería</span>
          </button>
        )}

        {t.estado === "EN_TRANSITO" && onRecibir && (
          <button
            disabled={actionLoading}
            onClick={() => onRecibir(t)}
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Recibir en Tienda</span>
          </button>
        )}

        {/* Ver Detalle */}
        <button
          onClick={() => onView(t)}
          className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition active:scale-98 cursor-pointer"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Ver</span>
        </button>

        {/* Print Guia */}
        {onPrint && (
          <button
            onClick={() => onPrint(t)}
            title="Imprimir Guía de Traspaso"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        )}

        {/* Cancelar (solo si solicitada) */}
        {t.estado === "SOLICITADA" && onCancelar && (
          <button
            disabled={actionLoading}
            onClick={() => onCancelar(t._id)}
            title="Cancelar solicitud"
            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
