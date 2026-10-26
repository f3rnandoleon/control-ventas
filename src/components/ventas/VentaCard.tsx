"use client";

import { useState } from "react";
import type { Pedido } from "@/types/pedido";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import ColorSwatch from "@/components/ui/ColorSwatch";

export default function VentaCard({
  venta,
  onVerDetalle,
}: {
  venta: Pedido;
  onVerDetalle: (pedido: Pedido) => void;
}) {
  const [expandItems, setExpandItems] = useState(false);

  const clienteNombre =
    venta.snapshotCliente?.nombreCompleto ||
    venta.cliente?.nombreCompleto ||
    "Venta mostrador";

  const vendedorNombre = venta.vendedor?.nombreCompleto || "Sin vendedor";

  const items = venta.items || [];
  const totalPrendas = items.reduce((acc, it) => acc + (it.cantidad || 1), 0);
  const visibleItems = expandItems ? items : items.slice(0, 2);
  const remainingCount = items.length - 2;

  // Formato de fecha amigable
  const fechaObj = new Date(venta.createdAt);
  const fechaFormatted = isNaN(fechaObj.getTime())
    ? venta.createdAt
    : fechaObj.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  // Badge de canal
  const canalConfig: Record<string, { label: string; icon: string; className: string }> = {
    TIENDA: {
      label: "Tienda",
      icon: "🏬",
      className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30",
    },
    WEB: {
      label: "Web",
      icon: "🌐",
      className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/30",
    },
    WHATSAPP: {
      label: "WhatsApp",
      icon: "💬",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30",
    },
    APP_QR: {
      label: "App QR",
      icon: "📱",
      className: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-500/30",
    },
  };

  const canalInfo = canalConfig[venta.canal] || {
    label: venta.canal || "Venta",
    icon: "🛒",
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/10",
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/70 p-4 shadow-sm hover:shadow-md transition-all space-y-3.5">
      {/* Cabecera: N° Pedido, Canal y Método */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
              #{venta.numeroPedido}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${canalInfo.className}`}
            >
              <span>{canalInfo.icon}</span>
              <span>{canalInfo.label}</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
            📅 {fechaFormatted}
          </p>
        </div>

        {/* Método de Pago */}
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
            venta.metodoPago === "EFECTIVO"
              ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
              : "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30"
          }`}
        >
          <span>{venta.metodoPago === "EFECTIVO" ? "💵" : "📱"}</span>
          <span>{venta.metodoPago}</span>
        </span>
      </div>

      {/* Productos con Imágenes, Modelos y Tallas */}
      <div className="space-y-2 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-black/20 p-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-gray-400 border-b border-slate-200/60 dark:border-white/5 pb-1.5">
          <span>Prendas vendidas ({totalPrendas} u.)</span>
          <span className="text-[10px] font-normal text-slate-400">
            {items.length} {items.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        <div className="space-y-2">
          {visibleItems.map((item, idx) => {
            const img = item.productoSnapshot?.imagen;
            const modelo = item.productoSnapshot?.modelo;
            const nombre = item.productoSnapshot?.nombre || "Producto";
            const color = item.variante?.color || "";
            const talla = item.variante?.talla || "";

            return (
              <div key={idx} className="flex items-center gap-2.5 text-xs">
                {/* Miniatura del producto */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40">
                  {img ? (
                    <CloudinaryImage
                      src={img}
                      alt={nombre}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg text-slate-400">
                      👕
                    </div>
                  )}
                  {item.cantidad > 1 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-cyan-500 px-1.5 py-0.2 text-[9px] font-bold text-black shadow-sm">
                      x{item.cantidad}
                    </span>
                  )}
                </div>

                {/* Info del producto y modelo */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900 dark:text-white truncate text-xs">
                      {nombre}
                    </p>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs shrink-0">
                      Bs {Number(item.totalLinea || item.precioUnitario * item.cantidad).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {modelo && (
                      <span className="rounded bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-cyan-300 dark:border dark:border-cyan-500/20 px-1.5 py-0.2 text-[10px] font-semibold">
                        Mod: {modelo}
                      </span>
                    )}
                    {color && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-gray-300">
                        <ColorSwatch colorName={color} size="xs" />
                        <span className="capitalize">{color}</span>
                      </div>
                    )}
                    {talla && (
                      <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-gray-400">
                        T.{talla}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      ({item.cantidad} u. x Bs {item.precioUnitario})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón para expandir si hay más productos */}
        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => setExpandItems(!expandItems)}
            className="w-full text-center py-1 text-[11px] font-bold text-sky-600 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            {expandItems ? "▲ Mostrar menos" : `▼ +${remainingCount} prenda(s) más en este pedido`}
          </button>
        )}
      </div>

      {/* Cliente y Vendedor */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-gray-300 pt-1">
        <div className="truncate">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Cliente</span>
          <span className="font-semibold text-slate-800 dark:text-gray-200 truncate block">
            👤 {clienteNombre}
          </span>
        </div>
        <div className="truncate text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Vendedor</span>
          <span className="font-semibold text-slate-800 dark:text-gray-200 truncate block">
            🏷️ {vendedorNombre}
          </span>
        </div>
      </div>

      {/* Pie de Tarjeta: Total y Botón Ver Detalle */}
      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">
            Total Venta
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-sky-700 dark:text-cyan-400">
              Bs {Number(venta.total).toFixed(2)}
            </span>
            {venta.descuento > 0 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold line-through">
                Desc: -Bs {Number(venta.descuento).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onVerDetalle(venta)}
          className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-xs font-bold px-3.5 py-2 active:scale-95 transition cursor-pointer shadow-sm"
        >
          <span>👁️</span>
          <span>Ver detalle</span>
        </button>
      </div>
    </div>
  );
}
