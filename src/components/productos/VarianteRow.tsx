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

export default function VarianteRow({
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
  const stockBadgeClass =
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
      <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors text-center text-xs">
        {/* Imagen */}
        <td className="py-2.5 px-3">
          {imagenPrincipal ? (
            <div className="relative inline-flex">
              <CloudinaryImage
                src={imagenPrincipal}
                alt={`${colorLabel}-${variante.talla}`}
                width={64}
                height={64}
                className="h-14 w-14 rounded-xl object-cover border border-slate-200 dark:border-white/10 shadow-sm"
              />
              {totalImagenes > 1 && (
                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-cyan-500 px-1.5 py-0.2 text-[10px] font-bold text-black shadow-sm">
                  +{totalImagenes - 1}
                </span>
              )}
            </div>
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 text-slate-400">
              👕
            </div>
          )}
        </td>

        {/* Color */}
        <td className="py-2.5 px-3 text-left">
          <div className="flex items-center gap-2">
            <ColorSwatch colorName={variante.color} className="h-4 w-4 shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-gray-200 capitalize">
              {colorLabel}
            </span>
          </div>
          {variante.codigoBarra && (
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono mt-0.5">
              {variante.codigoBarra}
            </p>
          )}
        </td>

        {/* Talla */}
        <td className="py-2.5 px-3">
          <span className="rounded-lg bg-sky-50 dark:bg-cyan-950/50 text-sky-800 dark:text-cyan-300 border border-sky-200 dark:border-cyan-500/30 px-2 py-0.5 text-xs font-bold font-mono">
            {variante.talla}
          </span>
        </td>

        {/* Stock */}
        <td className="py-2.5 px-3">
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${stockBadgeClass}`}
          >
            {stock === 0 ? "Agotado" : `${stock} u.`}
          </span>
        </td>

        {/* Precio y Medidas */}
        <td className="py-2.5 px-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-white">
                Bs {Number(precioVentaEfectivo).toFixed(2)}
              </span>
              {hasCustomPrice && (
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.2 text-[10px] text-cyan-600 dark:text-cyan-300 font-medium border border-cyan-500/20">
                  Diferenciado
                </span>
              )}
            </div>

            {hasMedidas ? (
              <button
                type="button"
                onClick={() => setShowMedidasModal(true)}
                className="text-[11px] text-sky-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>📏</span>
                <span>Ver medidas</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 dark:text-gray-500">Sin medidas</span>
            )}
          </div>
        </td>

        {/* Acciones */}
        <td className="py-2.5 px-3 text-right">
          {showDeleteConfirm ? (
            <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-xl border border-rose-200 dark:border-rose-500/30">
              <span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium mr-1">¿Eliminar?</span>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition active:scale-95 shadow-sm"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-gray-200 font-medium text-[11px] hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                No
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-medium transition cursor-pointer"
                onClick={onEdit}
                title="Editar todas las tallas de este color"
              >
                ✏️ Editar grupo
              </button>

              <button
                type="button"
                disabled={!variante.qrCode}
                className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 font-medium transition cursor-pointer disabled:opacity-40"
                onClick={() => {
                  if (!variante.qrCode) return;
                  window.open(getQRUrl(variante.qrCode), "_blank");
                }}
                title="Ver código QR"
              >
                📱 QR
              </button>

              <button
                type="button"
                disabled={!variante.codigoBarra}
                className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 font-medium transition cursor-pointer disabled:opacity-40"
                onClick={handleOpenBarcode}
                title="Ver código de barras"
              >
                🏷️ Bar
              </button>

              <button
                type="button"
                className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-medium transition cursor-pointer"
                onClick={() => setShowDeleteConfirm(true)}
                title="Eliminar esta variante"
              >
                🗑️
              </button>
            </div>
          )}
        </td>
      </tr>

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
