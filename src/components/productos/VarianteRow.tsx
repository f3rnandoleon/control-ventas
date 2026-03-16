"use client";

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
  onEdit,
  onDelete,
}: {
  variante: Variante;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const imagenPrincipal = getVarianteImagenPrincipal(variante);
  const totalImagenes = getVarianteImagenes(variante).length;

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 text-center">
      <td className="py-2">
        {imagenPrincipal ? (
          <div className="relative inline-flex">
            <CloudinaryImage
              src={imagenPrincipal}
              alt={`${variante.color}-${variante.talla}`}
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
      <td className="py-2">{variante.color}</td>
      <td>{variante.talla}</td>
      <td>{variante.stock}</td>

      <td className="text-right space-x-3">
        <button className="btn-link" onClick={onEdit}>
          Editar
        </button>

        {/* QR individual (ya lo tienes) */}
        <button
          className="btn-link"
          onClick={() => {
            if (!variante.qrCode) return; 
            window.open(getQRUrl(variante.qrCode), "_blank");
          }}
        >
          QR
        </button>
        {/* 🆕 Código de barras individual */}
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
  );
}
