"use client";

import { useState } from "react";
import { Pedido } from "@/types/pedido";
import DevolucionCambioModal from "@/components/ventas/DevolucionCambioModal";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import ColorSwatch from "@/components/ui/ColorSwatch";

export default function VentaDetalleModal({
  Pedido,
  onClose,
  onUpdated,
}: {
  Pedido: Pedido | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [modalDevolucionOpen, setModalDevolucionOpen] = useState(false);

  if (!Pedido) return null;

  const items = Pedido.items || [];
  const totalPrendas = items.reduce((acc, it) => acc + (it.cantidad || 1), 0);

  const clienteNombre =
    Pedido.snapshotCliente?.nombreCompleto ||
    Pedido.cliente?.nombreCompleto ||
    "Venta mostrador";

  const fechaObj = new Date(Pedido.createdAt);
  const fechaStr = isNaN(fechaObj.getTime())
    ? Pedido.createdAt
    : fechaObj.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[92dvh] rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-white/10 p-4 sm:p-5 bg-white/95 dark:bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                #{Pedido.numeroPedido}
              </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
                  Pedido.metodoPago === "EFECTIVO"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                    : "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30"
                }`}
              >
                {Pedido.metodoPago === "EFECTIVO" ? "💵 Efectivo" : "📱 QR"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              📅 {fechaStr}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-800 dark:text-gray-200">
          {/* Tarjetas de Contexto: Cliente y Vendedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                👤 Datos del Cliente
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {clienteNombre}
              </p>
              {Pedido.snapshotCliente?.telefono && (
                <p className="text-slate-500 dark:text-gray-400 font-mono">
                  Teléfono: {Pedido.snapshotCliente.telefono}
                </p>
              )}
              {Pedido.snapshotCliente?.numeroDocumento && (
                <p className="text-slate-500 dark:text-gray-400 font-mono">
                  Documento: {Pedido.snapshotCliente.tipoDocumento || "CI"}{" "}
                  {Pedido.snapshotCliente.numeroDocumento}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                🏷️ Vendedor y Canal
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {Pedido.vendedor?.nombreCompleto || "Venta mostrador / Sin vendedor"}
              </p>
              <p className="text-slate-500 dark:text-gray-400">
                Canal: <span className="font-semibold">{Pedido.canal}</span>
              </p>
              {Pedido.notas && (
                <p className="text-amber-600 dark:text-amber-400 text-[11px]">
                  Nota: {Pedido.notas}
                </p>
              )}
            </div>
          </div>

          {/* Listado de Prendas Vendidas con Imágenes y Modelos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Prendas Compradas ({totalPrendas} u.)
              </h3>
              <span className="text-xs text-sky-700 dark:text-cyan-400 font-semibold font-mono">
                {items.length} {items.length === 1 ? "ítem" : "ítems"}
              </span>
            </div>

            {/* VISTA MÓVIL: Tarjetas de prendas */}
            <div className="space-y-2.5 sm:hidden">
              {items.map((it, idx) => {
                const img = it.productoSnapshot?.imagen;
                const modelo = it.productoSnapshot?.modelo;
                const nombre = it.productoSnapshot?.nombre || "Prenda";
                const color = it.variante?.color || "";
                const talla = it.variante?.talla || "";

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] p-3 text-xs"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40">
                      {img ? (
                        <CloudinaryImage
                          src={img}
                          alt={nombre}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl text-slate-400">
                          👕
                        </div>
                      )}
                      {it.cantidad > 1 && (
                        <span className="absolute -right-1 -top-1 rounded-full bg-cyan-500 px-1.5 py-0.2 text-[9px] font-bold text-black shadow-sm">
                          x{it.cantidad}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {nombre}
                      </p>
                      {modelo && (
                        <span className="inline-block rounded bg-sky-100 text-sky-800 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border dark:border-cyan-500/20 px-1.5 py-0.2 text-[10px] font-semibold font-mono">
                          Mod: {modelo}
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-gray-300">
                        {color && (
                          <div className="flex items-center gap-1">
                            <ColorSwatch colorName={color} size="xs" />
                            <span className="capitalize">{color}</span>
                          </div>
                        )}
                        {talla && (
                          <span className="rounded bg-slate-200 dark:bg-white/10 px-1.5 py-0.2 font-mono font-bold text-[10px]">
                            T.{talla}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-white/5">
                        <span className="text-slate-400">
                          {it.cantidad} u. x Bs {Number(it.precioUnitario).toFixed(2)}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          Bs {Number(it.totalLinea || it.precioUnitario * it.cantidad).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA ESCRITORIO: Tabla con imágenes */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Prenda</th>
                    <th className="py-2.5 px-3">Modelo / SKU</th>
                    <th className="py-2.5 px-3">Variante</th>
                    <th className="py-2.5 px-3 text-center">Cant.</th>
                    <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                  {items.map((it, idx) => {
                    const img = it.productoSnapshot?.imagen;
                    const modelo = it.productoSnapshot?.modelo;
                    const nombre = it.productoSnapshot?.nombre || "Prenda";
                    const sku = it.productoSnapshot?.sku;
                    const color = it.variante?.color || "";
                    const talla = it.variante?.talla || "";

                    return (
                      <tr key={idx} className="hover:bg-white/60 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30">
                              {img ? (
                                <CloudinaryImage
                                  src={img}
                                  alt={nombre}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                                  👕
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {nombre}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-sky-700 dark:text-cyan-400 font-mono">
                            {modelo ? `Mod: ${modelo}` : "—"}
                          </div>
                          {sku && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {sku}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {color && <ColorSwatch colorName={color} size="xs" />}
                            <span className="capitalize">{color || "Sin color"}</span>
                            {talla && (
                              <span className="rounded bg-sky-100 dark:bg-cyan-950 px-1.5 py-0.2 text-[10px] font-bold text-sky-800 dark:text-cyan-300 font-mono ml-1">
                                T.{talla}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center font-bold">
                          {it.cantidad}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          Bs {Number(it.precioUnitario).toFixed(2)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                          Bs {Number(it.totalLinea || it.precioUnitario * it.cantidad).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Desglose Financiero */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-gray-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800 dark:text-gray-200">
                Bs {Number(Pedido.subtotal || Pedido.total).toFixed(2)}
              </span>
            </div>

            {Pedido.descuento > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Descuento aplicado:</span>
                <span className="font-bold">
                  - Bs {Number(Pedido.descuento).toFixed(2)}
                </span>
              </div>
            )}

            {Pedido.costoEnvio !== undefined && Pedido.costoEnvio > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-gray-400">
                <span>Costo de envío:</span>
                <span className="font-semibold text-slate-800 dark:text-gray-200">
                  Bs {Number(Pedido.costoEnvio).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-white/10">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                Total Pagado:
              </span>
              <span className="text-xl font-extrabold text-sky-700 dark:text-cyan-400">
                Bs {Number(Pedido.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-white/10 p-4 bg-white/95 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={() => setModalDevolucionOpen(true)}
            className="w-full sm:w-auto flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <span>🔄</span>
            <span>Procesar Devolución / Cambio</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[38px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 px-5 py-2 text-xs font-bold text-slate-700 dark:text-gray-200 transition active:scale-95 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {modalDevolucionOpen && (
        <DevolucionCambioModal
          pedido={Pedido}
          onClose={() => setModalDevolucionOpen(false)}
          onSuccess={() => {
            onUpdated?.();
            onClose();
          }}
        />
      )}
    </div>
  );
}
