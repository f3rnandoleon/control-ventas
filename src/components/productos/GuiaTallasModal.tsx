"use client";

import { Producto, Variante } from "@/types/producto";

interface GuiaTallasModalProps {
  producto: Producto;
  isOpen: boolean;
  onClose: () => void;
}

export default function GuiaTallasModal({
  producto,
  isOpen,
  onClose,
}: GuiaTallasModalProps) {
  if (!isOpen) return null;

  // Filtrar variantes que tengan al menos una medida configurada
  const variantesConMedidas = (producto.variantes || []).filter(
    (v) =>
      v.medidas &&
      Object.values(v.medidas).some((val) => typeof val === "number" && val > 0)
  );

  // Agrupar por talla única para no duplicar filas si hay varios colores de la misma talla
  const tallasMap = new Map<string, NonNullable<Variante["medidas"]>>();
  variantesConMedidas.forEach((v) => {
    if (v.talla && v.medidas && !tallasMap.has(v.talla)) {
      tallasMap.set(v.talla, v.medidas);
    }
  });

  const tallasConMedidas = Array.from(tallasMap.entries());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="surface-card-strong max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 p-5 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📏</span>
              <span>Guía de Tallas y Medidas</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {producto.nombre} ({producto.modelo}) — Todas las medidas expresadas en centímetros (cm).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {tallasConMedidas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-400">
              Este producto aún no cuenta con medidas registradas en sus variantes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="border-b border-white/10 bg-white/5 text-gray-400 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Talla</th>
                    <th className="py-2.5 px-3">Pecho (axila-axila)</th>
                    <th className="py-2.5 px-3">Ancho hombros</th>
                    <th className="py-2.5 px-3">Largo total</th>
                    <th className="py-2.5 px-3">Manga (axila)</th>
                    <th className="py-2.5 px-3">Manga (hombro)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tallasConMedidas.map(([talla, medidas]) => (
                    <tr key={talla} className="hover:bg-white/5">
                      <td className="py-2.5 px-3 font-bold text-cyan-400">
                        {talla}
                      </td>
                      <td className="py-2.5 px-3">
                        {medidas.anchoPecho ? `${medidas.anchoPecho} cm` : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {medidas.anchoHombros ? `${medidas.anchoHombros} cm` : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {medidas.largoTotal ? `${medidas.largoTotal} cm` : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {medidas.largoMangaAxila ? `${medidas.largoMangaAxila} cm` : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {medidas.largoMangaHombro ? `${medidas.largoMangaHombro} cm` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-5 py-2 text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
