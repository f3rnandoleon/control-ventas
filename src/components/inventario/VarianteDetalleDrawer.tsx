"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/utils/pricing";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { useAuth } from "@/context/AuthContext";
import type { ProductoInventario } from "@/types/inventario";
import type { Variante } from "@/types/producto";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import AjusteStockModal from "./AjusteStockModal";

interface NivelStockSucursal {
  _id: string;
  sucursalId: {
    _id: string;
    nombre: string;
    codigo: string;
    tipo: string;
    permiteVentaPOS: boolean;
    activa: boolean;
  };
  varianteId: string;
  stockFisico: number;
  stockReservado: number;
  stockMinimo: number;
}

interface VarianteDetalleDrawerProps {
  producto: ProductoInventario | null;
  variante: Variante | null;
  tipoCambioOficial?: number;
  onClose: () => void;
  onStockUpdated?: () => void;
}

export default function VarianteDetalleDrawer({
  producto,
  variante,
  tipoCambioOficial = 1.85,
  onClose,
  onStockUpdated,
}: VarianteDetalleDrawerProps) {
  const { user } = useAuth();
  const isAdmin = user?.rol === "ADMIN";

  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [nivelesSucursal, setNivelesSucursal] = useState<NivelStockSucursal[]>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);

  useEffect(() => {
    if (!producto || !variante) return;

    let isMounted = true;
    setLoadingSucursales(true);

    fetch(`/api/admin/productos/${producto._id}/stock-sucursales`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: NivelStockSucursal[]) => {
        if (!isMounted) return;
        // Filtrar solo los niveles de esta variante específica
        const varId = variante.varianteId || `${variante.color}-${variante.talla}`;
        const filtrados = data.filter((n) => n.varianteId === varId);
        setNivelesSucursal(filtrados);
      })
      .catch(() => {
        if (isMounted) setNivelesSucursal([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSucursales(false);
      });

    return () => {
      isMounted = false;
    };
  }, [producto, variante]);

  if (!producto || !variante) return null;

  const imagen = getVarianteImagenPrincipal(variante) || (producto.variantes?.[0] ? getVarianteImagenPrincipal(producto.variantes[0]) : "");
  const stockFisico = Number(variante.stock || 0);
  const stockReservado = Number(variante.stockReservado || 0);
  const stockDisponible = Math.max(0, stockFisico - stockReservado);

  const precioVenta = Number(variante.precioVenta || producto.precioVenta || 0);
  const precioCosto = Number(variante.precioCosto || producto.precioCosto || 0);
  const gananciaBruta = precioVenta - precioCosto;
  const margenPorcentaje = precioVenta > 0 ? (gananciaBruta / precioVenta) * 100 : 0;
  const valorTotalStock = stockFisico * precioCosto;

  // Conversión aproximada a USD y PEN según TC
  const costoUSD = tipoCambioOficial > 0 ? (precioCosto / 6.96).toFixed(2) : "0.00";
  const costoPEN = tipoCambioOficial > 0 ? (precioCosto / tipoCambioOficial).toFixed(2) : "0.00";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 w-full sm:w-auto">
        <div className="w-full sm:max-w-md h-[100dvh] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col justify-between transition-colors">
          {/* HEADER DEL DRAWER */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 flex-shrink-0">
                {imagen ? (
                  <CloudinaryImage
                    src={imagen}
                    alt={producto.nombre}
                    width={100}
                    height={100}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl text-slate-400 dark:text-gray-500">
                    👕
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-700 dark:text-cyan-400 font-bold block">
                  {producto.sku}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {producto.nombre}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                  {producto.modelo ? `Modelo: ${producto.modelo}` : producto.categoria || "Ropa"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* CONTENIDO SCROLLEABLE */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-6 text-sm">
            {/* CARACTERÍSTICAS DE LA VARIANTE */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Características de la Variante
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/60 p-2.5 shadow-sm">
                  <span className="text-slate-500 dark:text-gray-400 block text-[10px] font-medium">Color Principal</span>
                  <span className="font-semibold text-slate-900 dark:text-white capitalize">{variante.color}</span>
                  {variante.colorSecundario && (
                    <span className="text-slate-400 dark:text-gray-400 block text-[10px]">
                      Secundario: {variante.colorSecundario}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/60 p-2.5 shadow-sm">
                  <span className="text-slate-500 dark:text-gray-400 block text-[10px] font-medium">Talla</span>
                  <span className="font-bold text-sky-700 dark:text-cyan-300 text-sm font-mono">
                    {variante.talla}
                  </span>
                </div>
                {variante.codigoBarra && (
                  <div className="col-span-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/60 p-2.5 shadow-sm">
                    <span className="text-slate-500 dark:text-gray-400 block text-[10px] font-medium">Código de Barras</span>
                    <span className="font-mono text-slate-800 dark:text-gray-200 text-xs">
                      {variante.codigoBarra}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ESTADO GLOBAL DE STOCK */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                  Resumen de Stock Consolidado
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    stockDisponible === 0
                      ? "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30"
                      : stockDisponible <= (producto.stockMinimo || 2)
                      ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                  }`}
                >
                  {stockDisponible === 0
                    ? "AGOTADO"
                    : stockDisponible <= (producto.stockMinimo || 2)
                    ? "STOCK BAJO"
                    : "DISPONIBLE"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/60 p-3 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-medium">Físico Total</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{stockFisico} u.</span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/60 p-3 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-medium">Reservado</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-300">{stockReservado} u.</span>
                </div>
                <div className="rounded-xl border border-sky-300 dark:border-cyan-500/30 bg-sky-50 dark:bg-cyan-950/20 p-3 shadow-sm">
                  <span className="text-[10px] text-sky-700 dark:text-cyan-300 block font-bold">Disponible</span>
                  <span className="text-lg font-extrabold text-sky-700 dark:text-cyan-300">{stockDisponible} u.</span>
                </div>
              </div>
            </div>

            {/* DISPONIBILIDAD POR SUCURSAL */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center justify-between">
                <span>Stock por Sucursal / Tienda</span>
                {loadingSucursales && (
                  <span className="text-[10px] text-sky-600 dark:text-cyan-400 animate-pulse font-semibold">Cargando...</span>
                )}
              </h4>

              {loadingSucursales ? (
                <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-white/5" />
              ) : nivelesSucursal.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-gray-400 italic py-2">
                  No hay registros de existencias en tiendas para esta variante (stock centralizado o en almacén principal).
                </p>
              ) : (
                <div className="space-y-2">
                  {nivelesSucursal.map((nivel) => {
                    const disp = Math.max(0, (nivel.stockFisico || 0) - (nivel.stockReservado || 0));
                    return (
                      <div
                        key={nivel._id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/40 text-xs shadow-sm"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-gray-200 block">
                            {nivel.sucursalId?.nombre || "Sucursal"}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">
                            {nivel.sucursalId?.codigo || "COD"} • {nivel.sucursalId?.tipo || "TIENDA"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white block">{disp} disp.</span>
                          <span className="text-[10px] text-slate-500 dark:text-gray-400">
                            ({nivel.stockFisico} fís. - {nivel.stockReservado} res.)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DETALLES FINANCIEROS Y DE COSTO (SOLO ADMIN) */}
            {isAdmin ? (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-gradient-to-br dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>💰</span> Análisis Financiero y CPP
                  </h4>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">
                    Solo Administrador
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-emerald-200/60 dark:border-white/5">
                    <span className="text-slate-600 dark:text-gray-400">Costo Promedio Ponderado (BOB):</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono text-sm">
                      {formatMoney(precioCosto)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-emerald-200/60 dark:border-white/5">
                    <span className="text-slate-600 dark:text-gray-400">Equivalente Moneda Extranjera:</span>
                    <div className="text-right font-mono text-[11px] text-slate-700 dark:text-gray-300">
                      <div>${costoUSD} USD <span className="text-slate-400 dark:text-gray-500">(TC 6.96)</span></div>
                      <div>S/ {costoPEN} PEN <span className="text-slate-400 dark:text-gray-500">(TC {tipoCambioOficial})</span></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-emerald-200/60 dark:border-white/5">
                    <span className="text-slate-600 dark:text-gray-400">Precio de Venta al Público:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                      {formatMoney(precioVenta)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-emerald-200/60 dark:border-white/5">
                    <span className="text-slate-600 dark:text-gray-400">Margen de Ganancia Unitario:</span>
                    <div className="text-right">
                      <span className="font-bold text-teal-700 dark:text-teal-300 font-mono block">
                        {formatMoney(gananciaBruta)}
                      </span>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                        ({margenPorcentaje.toFixed(1)}% margen)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1.5 pt-2">
                    <span className="text-slate-600 dark:text-gray-400 font-medium">Capital Invertido en Stock:</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                      {formatMoney(valorTotalStock)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 text-xs text-slate-600 dark:text-gray-400 flex items-center justify-between">
                <span>Precio de venta sugerido:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {formatMoney(precioVenta)}
                </span>
              </div>
            )}
          </div>

          {/* FOOTER DE ACCIONES */}
          <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2.5 shrink-0">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/admin/inventario/kardex?productoId=${producto._id}`}
                  className="px-3 py-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 dark:text-cyan-300 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📊</span> Kardex
                </Link>
                <button
                  type="button"
                  onClick={() => setModalAjusteAbierto(true)}
                  className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-300 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⚖️</span> Ajustar Stock
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold transition ml-auto cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE AJUSTE DE STOCK */}
      {modalAjusteAbierto && (
        <AjusteStockModal
          isOpen={modalAjusteAbierto}
          producto={producto}
          variante={variante}
          onClose={() => setModalAjusteAbierto(false)}
          onSuccess={() => {
            setModalAjusteAbierto(false);
            if (onStockUpdated) onStockUpdated();
            // Recargar niveles de sucursal
            fetch(`/api/admin/productos/${producto._id}/stock-sucursales`)
              .then((res) => (res.ok ? res.json() : []))
              .then((data: NivelStockSucursal[]) => {
                const varId = variante.varianteId || `${variante.color}-${variante.talla}`;
                const filtrados = data.filter((n) => n.varianteId === varId);
                setNivelesSucursal(filtrados);
              })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
