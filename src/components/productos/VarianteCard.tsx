"use client";

import { useState } from "react";
import { Variante } from "@/types/producto";
import { getQRUrl } from "@/utils/qr";
import { generarCodigoBarraImagen } from "@/utils/barcode";
import {
  getVarianteImagenPrincipal,
  getVarianteImagenes,
} from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import ColorSwatch from "@/components/ui/ColorSwatch";

export default function VarianteCard({
  variante,
  precioBaseVenta,
  precioBaseCosto,
  onEdit,
  onDelete,
}: {
  variante: Variante;
  precioBaseVenta?: number;
  precioBaseCosto?: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMedidasModal, setShowMedidasModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const imagenPrincipal = getVarianteImagenPrincipal(variante);
  const totalImagenes = getVarianteImagenes(variante).length;
  const colorLabel = variante.colorSecundario
    ? `${variante.color} / ${variante.colorSecundario}`
    : variante.color;

  const hasCustomPrice = Boolean(
    (variante.precioVenta &&
      variante.precioVenta > 0 &&
      variante.precioVenta !== precioBaseVenta) ||
      (variante.precioCosto &&
        variante.precioCosto > 0 &&
        variante.precioCosto !== precioBaseCosto)
  );

  const precioVentaEfectivo = variante.precioVenta || precioBaseVenta || 0;
  const hasMedidas = Boolean(
    variante.medidas &&
      Object.values(variante.medidas).some(
        (v) => typeof v === "number" && v > 0
      )
  );

  const stock = variante.stock || 0;
  const stockColorClass =
    stock === 0
      ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
      : stock <= 3
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
      : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30";

  const handleOpenBarcode = () => {
    if (!variante.codigoBarra) return;
    const img = generarCodigoBarraImagen(variante.codigoBarra);
    const win = window.open("");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${variante.codigoBarra}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px; background: #fff; color: #111; }
            h2 { font-size: 16px; margin-bottom: 8px; }
            p { font-size: 13px; color: #666; margin-top: 4px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <h2>${colorLabel} - Talla ${variante.talla}</h2>
          <img src="${img}" alt="${variante.codigoBarra}" />
          <p>${variante.codigoBarra}</p>
        </body>
      </html>
    `);
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/70 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all space-y-3">
        {/* Cabecera de la tarjeta: Imagen + Identificación + Stock */}
        <div className="flex items-start gap-3">
          {/* Miniatura de la variante */}
          <div className="relative h-18 w-18 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40">
            {imagenPrincipal ? (
              <CloudinaryImage
                src={imagenPrincipal}
                alt={`${colorLabel}-${variante.talla}`}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400 dark:text-gray-500">
                👕
              </div>
            )}
            {totalImagenes > 1 && (
              <span className="absolute right-1 top-1 rounded-full bg-cyan-500 px-1.5 py-0.2 text-[10px] font-bold text-black shadow-sm">
                +{totalImagenes - 1}
              </span>
            )}
          </div>

          {/* Información principal */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <ColorSwatch colorName={variante.color} className="h-3.5 w-3.5 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white text-sm truncate capitalize">
                  {colorLabel}
                </span>
              </div>
              <span
                className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${stockColorClass}`}
              >
                {stock === 0 ? "Agotado" : stock <= 3 ? `Bajo (${stock})` : `${stock} u.`}
              </span>
            </div>

            {/* Talla y Precios */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-lg bg-sky-100 dark:bg-cyan-950/60 text-sky-800 dark:text-cyan-300 border border-sky-200 dark:border-cyan-500/30 px-2 py-0.5 text-xs font-bold font-mono">
                Talla {variante.talla}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Bs {Number(precioVentaEfectivo).toFixed(2)}
              </span>
              {hasCustomPrice && (
                <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">
                  Diferenciado
                </span>
              )}
            </div>

            {/* Código / Medidas preview */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-500 dark:text-gray-400">
              {variante.codigoBarra && (
                <span className="font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-white/5">
                  🏷️ {variante.codigoBarra}
                </span>
              )}
              {hasMedidas && (
                <button
                  type="button"
                  onClick={() => setShowMedidasModal(true)}
                  className="inline-flex items-center gap-1 text-sky-600 dark:text-cyan-400 hover:underline font-medium"
                >
                  <span>📏</span>
                  <span>Ver medidas</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Zona de confirmación de eliminación o Botones de Acción */}
        {showDeleteConfirm ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 p-2.5 text-xs text-rose-900 dark:text-rose-200 space-y-2 animate-in fade-in duration-150">
            <p className="font-semibold text-center">
              ¿Eliminar talla {variante.talla} ({colorLabel})?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                className="min-h-[36px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition active:scale-95 shadow-sm"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="min-h-[36px] rounded-lg border border-slate-200 bg-white hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-300 font-medium transition active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 dark:border-white/5 text-xs font-semibold">
            {/* Editar grupo de este color */}
            <button
              type="button"
              onClick={onEdit}
              title="Editar todas las tallas de este color"
              className="col-span-1 min-h-[38px] flex items-center justify-center gap-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 active:scale-95 transition"
            >
              <span>✏️</span>
              <span className="hidden xs:inline">Editar</span>
            </button>

            {/* QR individual */}
            <button
              type="button"
              onClick={() => {
                if (!variante.qrCode) return;
                window.open(getQRUrl(variante.qrCode), "_blank");
              }}
              disabled={!variante.qrCode}
              title={variante.qrCode ? "Abrir código QR" : "Sin código QR"}
              className="col-span-1 min-h-[38px] flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 active:scale-95 disabled:opacity-40 transition"
            >
              <span>📱</span>
              <span>QR</span>
            </button>

            {/* Código de barras */}
            <button
              type="button"
              onClick={handleOpenBarcode}
              disabled={!variante.codigoBarra}
              title={variante.codigoBarra ? "Ver código de barras" : "Sin código de barras"}
              className="col-span-1 min-h-[38px] flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 active:scale-95 disabled:opacity-40 transition"
            >
              <span>🏷️</span>
              <span>Bar</span>
            </button>

            {/* Eliminar variante individual */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Eliminar esta variante"
              className="col-span-1 min-h-[38px] flex items-center justify-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 active:scale-95 transition"
            >
              <span>🗑️</span>
              <span className="hidden xs:inline">Borrar</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal de visualización de medidas */}
      {showMedidasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Medidas de Prenda
                </h4>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Talla {variante.talla} ({colorLabel})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMedidasModal(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm text-slate-700 dark:text-gray-300">
              {variante.medidas?.anchoPecho !== undefined && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-gray-400">Ancho de pecho:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{variante.medidas.anchoPecho} cm</span>
                </div>
              )}
              {variante.medidas?.anchoHombros !== undefined && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-gray-400">Ancho de hombros:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{variante.medidas.anchoHombros} cm</span>
                </div>
              )}
              {variante.medidas?.largoTotal !== undefined && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-gray-400">Largo total:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{variante.medidas.largoTotal} cm</span>
                </div>
              )}
              {variante.medidas?.largoMangaAxila !== undefined && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-gray-400">Largo manga (axila):</span>
                  <span className="font-bold text-slate-900 dark:text-white">{variante.medidas.largoMangaAxila} cm</span>
                </div>
              )}
              {variante.medidas?.largoMangaHombro !== undefined && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-gray-400">Largo manga (hombro):</span>
                  <span className="font-bold text-slate-900 dark:text-white">{variante.medidas.largoMangaHombro} cm</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMedidasModal(false)}
              className="btn-primary w-full text-xs py-2.5 mt-2 font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
