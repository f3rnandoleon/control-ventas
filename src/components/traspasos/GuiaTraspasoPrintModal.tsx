"use client";

import type { Traspaso } from "@/types/traspaso";
import type { Sucursal } from "@/types/sucursal";
import type { Producto } from "@/types/producto";

interface GuiaTraspasoPrintModalProps {
  traspaso: Traspaso | null;
  productosMap?: Record<string, Producto>;
  onClose: () => void;
}

export default function GuiaTraspasoPrintModal({
  traspaso: t,
  productosMap = {},
  onClose,
}: GuiaTraspasoPrintModalProps) {
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
      ? t.solicitadoPor.nombreCompleto
      : "Sistema";

  const despachador =
    typeof t.despachadoPor === "object" && t.despachadoPor !== null
      ? t.despachadoPor.nombreCompleto
      : "-";

  const itemsResolved = (t.items || []).map((it) => {
    const liveProd = productosMap[it.productoId];
    const resolvedModelo = it.productoSnapshot?.modelo || liveProd?.modelo || "";
    return {
      ...it,
      resolvedModelo,
    };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col print:border-none print:bg-white print:p-0 print:m-0 print:shadow-none print:max-w-none">
        {/* Controls Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Guía de Traspaso</span>
            <span className="text-xs text-slate-400 font-mono">({t.numeroTraspaso})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-950/40 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Imprimir / Guardar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white text-slate-900 print:p-6 print:m-0 print:text-black">
          {/* Header de la Guía */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                GUÍA DE TRASPASO INTERNO
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Control de Movimiento entre Sucursales y Almacenes
              </p>
              <p className="text-xs text-slate-500">
                Fecha emisión:{" "}
                {new Date().toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-slate-500 block uppercase">Nº Transferencia</span>
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                {t.numeroTraspaso}
              </span>
              <span className="inline-block px-2.5 py-0.5 mt-1 rounded-md bg-slate-100 text-slate-800 text-xs font-bold uppercase border border-slate-300">
                Estado: {t.estado}
              </span>
            </div>
          </div>

          {/* Rutas Origen y Destino */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 space-y-1">
              <span className="font-bold text-slate-600 uppercase block tracking-wider">
                1. SUCURSAL REMITENTE (ORIGEN)
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {origen?.nombre || "Origen"} {origen?.codigo ? `[${origen.codigo}]` : ""}
              </p>
              <p className="text-slate-600">{origen?.direccion || "Dirección no especificada"}</p>
              <p className="text-slate-600">
                Solicitado por: <strong className="text-slate-800">{solicitante}</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 space-y-1">
              <span className="font-bold text-slate-600 uppercase block tracking-wider">
                2. SUCURSAL DESTINATARIA (DESTINO)
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {destino?.nombre || "Destino"} {destino?.codigo ? `[${destino.codigo}]` : ""}
              </p>
              <p className="text-slate-600">{destino?.direccion || "Dirección no especificada"}</p>
              <p className="text-slate-600">
                Despachado por: <strong className="text-slate-800">{despachador}</strong>
              </p>
            </div>
          </div>

          {/* Motivo & Instrucciones */}
          {(t.motivo || t.notas) && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1">
              {t.motivo && (
                <p>
                  <strong className="text-slate-700">Motivo:</strong> {t.motivo}
                </p>
              )}
              {t.notas && (
                <p>
                  <strong className="text-slate-700">Instrucciones de Envío:</strong> {t.notas}
                </p>
              )}
            </div>
          )}

          {/* Tabla de Mercadería */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2.5 text-center w-8">#</th>
                  <th className="px-3 py-2.5">Descripción de Prenda</th>
                  <th className="px-3 py-2.5 text-center">Modelo</th>
                  <th className="px-3 py-2.5 text-center">Color</th>
                  <th className="px-3 py-2.5 text-center">Talla</th>
                  <th className="px-3 py-2.5 text-center font-bold">Cant. Enviada</th>
                  <th className="px-3 py-2.5 text-center print:table-cell">Check Recepción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemsResolved.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-bold text-slate-900">{it.productoSnapshot?.nombre}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        SKU: {it.productoSnapshot?.sku || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700">
                      {it.resolvedModelo || "-"}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-700">
                      {it.varianteSnapshot?.color}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-slate-900">
                      {it.varianteSnapshot?.talla}
                    </td>
                    <td className="px-3 py-2 text-center font-black text-slate-900 text-sm">
                      {it.cantidadEnviada}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="w-6 h-6 border-2 border-slate-400 rounded mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-900">
                <tr>
                  <td colSpan={5} className="px-3 py-2.5 text-right uppercase">
                    Total Prendas Despachadas:
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm font-black">
                    {t.totalPrendasEnviadas} un.
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Firmas de Conformidad */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold text-slate-900">Entregado por (Origen)</p>
              <p className="text-[11px] text-slate-500">Firma y Sello</p>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold text-slate-900">Transportado por (Chofer)</p>
              <p className="text-[11px] text-slate-500">Nombre y C.I.</p>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold text-slate-900">Recibido Conforme (Destino)</p>
              <p className="text-[11px] text-slate-500">Firma y Sello Tienda</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-200">
            Documento interno de control logístico y auditoría de inventario.
          </div>
        </div>
      </div>
    </div>
  );
}
