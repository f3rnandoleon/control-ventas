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

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/5 text-center">
        <td className="py-2">
          {imagenPrincipal ? (
            <div className="relative inline-flex">
              <CloudinaryImage
                src={imagenPrincipal}
                alt={`${colorLabel}-${variante.talla}`}
                width={80}
                height={80}
                className="h-20 w-20 rounded object-cover border border-white/10"
              />
              {totalImagenes > 1 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-cyan-500 px-2 py-0.5 text-xs font-semibold text-black">
                  +{totalImagenes - 1}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-500">Sin imagen</span>
          )}
        </td>
        <td className="py-2">{colorLabel}</td>
        <td>{variante.talla}</td>
        <td>{variante.stock}</td>

        {/* Precio y Medidas */}
        <td className="py-2">
          <div className="flex flex-col items-center gap-1 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-white">
                Bs {Number(precioVentaEfectivo).toFixed(2)}
              </span>
              {hasCustomPrice && (
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300 font-medium border border-cyan-500/30">
                  Diferenciado
                </span>
              )}
            </div>

            {hasMedidas ? (
              <button
                type="button"
                onClick={() => setShowMedidasModal(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 cursor-pointer"
              >
                <span>📏</span>
                <span>Ver medidas</span>
              </button>
            ) : (
              <span className="text-[10px] text-gray-500">Sin medidas</span>
            )}
          </div>
        </td>

        <td className="text-right space-x-3">
          <button className="btn-link" onClick={onEdit} title="Editar todas las tallas de este color">
            Editar grupo
          </button>

          {/* QR individual */}
          <button
            className="btn-link"
            onClick={() => {
              if (!variante.qrCode) return;
              window.open(getQRUrl(variante.qrCode), "_blank");
            }}
          >
            QR
          </button>
          {/* Código de barras individual */}
          <button
            className="btn-link"
            onClick={() => {
              if (!variante.codigoBarra) return;

              const img = generarCodigoBarraImagen(variante.codigoBarra);

              const win = window.open("");
              if (!win) return;

              win.document.write(`
                <html>
                  <head>
                    <title>${variante.codigoBarra}</title>
                  </head>
                  <body style="text-align:center;font-family:sans-serif">
                    <p>${variante.codigoBarra}</p>
                    <img src="${img}" />
                  </body>
                </html>
              `);
            }}
          >
            Código
          </button>

          <button className="btn-danger" onClick={onDelete}>
            Eliminar
          </button>
        </td>
      </tr>

      {/* Modal de visualización de medidas */}
      {showMedidasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-base font-semibold text-white">
                Medidas — Talla {variante.talla} ({colorLabel})
              </h4>
              <button
                type="button"
                onClick={() => setShowMedidasModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-300">
              {variante.medidas?.anchoPecho !== undefined && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Ancho de pecho (axila a axila):</span>
                  <span className="font-semibold text-white">{variante.medidas.anchoPecho} cm</span>
                </div>
              )}
              {variante.medidas?.anchoHombros !== undefined && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Ancho de hombros:</span>
                  <span className="font-semibold text-white">{variante.medidas.anchoHombros} cm</span>
                </div>
              )}
              {variante.medidas?.largoTotal !== undefined && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Largo total:</span>
                  <span className="font-semibold text-white">{variante.medidas.largoTotal} cm</span>
                </div>
              )}
              {variante.medidas?.largoMangaAxila !== undefined && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Largo de manga (axila a puño):</span>
                  <span className="font-semibold text-white">{variante.medidas.largoMangaAxila} cm</span>
                </div>
              )}
              {variante.medidas?.largoMangaHombro !== undefined && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Largo de manga (hombro a puño):</span>
                  <span className="font-semibold text-white">{variante.medidas.largoMangaHombro} cm</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMedidasModal(false)}
              className="btn-primary w-full text-xs py-2 mt-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
