"use client";

import { Variante } from "@/types/producto";
import { getQRUrl } from "@/utils/qr";
import { generarCodigoBarraImagen } from "@/utils/barcode";

export default function VarianteRow({
  variante,
  onEdit,
  onDelete,
}: {
  variante: Variante;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/5">
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
