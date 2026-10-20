"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/utils/pricing";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { useAuth } from "@/context/AuthContext";
import type { ProductoInventario } from "@/types/inventario";
import type { Variante } from "@/types/producto";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";

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
}

export default function VarianteDetalleDrawer({
  producto,
  variante,
  tipoCambioOficial = 1.85,
  onClose,
}: VarianteDetalleDrawerProps) {
  const { user } = useAuth();
  const isAdmin = user?.rol === "ADMIN";

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col justify-between">
          {/* HEADER DEL DRAWER */}
          <div className="p-6 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-black/40 flex-shrink-0">
                {imagen ? (
                  <CloudinaryImage
                    src={imagen}
                    alt={producto.nombre}
                    width={100}
                    height={100}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl text-gray-500">
                    👕
                  </div>
                )}
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  {producto.sku}
                </span>
                <h3 className="text-base font-bold text-white line-clamp-1">
                  {producto.nombre}
                </h3>
                <p className="text-xs text-gray-400">
                  {producto.modelo ? `Modelo: ${producto.modelo}` : producto.categoria || "Ropa"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* CONTENIDO SCROLLEABLE */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            {/* CARACTERÍSTICAS DE LA VARIANTE */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Características de la Variante
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/5 bg-slate-800/60 p-2.5">
                  <span className="text-gray-400 block text-[10px]">Color Principal</span>
                  <span className="font-semibold text-white capitalize">{variante.color}</span>
                  {variante.colorSecundario && (
                    <span className="text-gray-400 block text-[10px]">
                      Secundario: {variante.colorSecundario}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-800/60 p-2.5">
                  <span className="text-gray-400 block text-[10px]">Talla</span>
                  <span className="font-bold text-cyan-300 text-sm font-mono">
                    {variante.talla}
                  </span>
                </div>
                {variante.codigoBarra && (
                  <div className="col-span-2 rounded-xl border border-white/5 bg-slate-800/60 p-2.5">
                    <span className="text-gray-400 block text-[10px]">Código de Barras</span>
                    <span className="font-mono text-gray-200 text-xs">
                      {variante.codigoBarra}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ESTADO GLOBAL DE STOCK */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Resumen de Stock Consolidado
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    stockDisponible === 0
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : stockDisponible <= (producto.stockMinimo || 2)
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
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
                <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3">
                  <span className="text-[10px] text-gray-400 block">Físico Total</span>
                  <span className="text-lg font-bold text-white">{stockFisico} u.</span>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3">
                  <span className="text-[10px] text-gray-400 block">Reservado</span>
                  <span className="text-lg font-bold text-amber-300">{stockReservado} u.</span>
                </div>
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3">
                  <span className="text-[10px] text-cyan-300 block">Disponible</span>
                  <span className="text-lg font-extrabold text-cyan-300">{stockDisponible} u.</span>
                </div>
              </div>
            </div>

            {/* DISPONIBILIDAD POR SUCURSAL */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                <span>Stock por Sucursal / Tienda</span>
                {loadingSucursales && (
                  <span className="text-[10px] text-cyan-400 animate-pulse">Cargando...</span>
                )}
              </h4>

              {loadingSucursales ? (
                <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              ) : nivelesSucursal.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">
                  No hay registros de existencias en tiendas para esta variante (stock centralizado o en almacén principal).
                </p>
              ) : (
                <div className="space-y-2">
                  {nivelesSucursal.map((nivel) => {
                    const disp = Math.max(0, (nivel.stockFisico || 0) - (nivel.stockReservado || 0));
                    return (
                      <div
                        key={nivel._id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-slate-800/40 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-gray-200 block">
                            {nivel.sucursalId?.nombre || "Sucursal"}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {nivel.sucursalId?.codigo || "COD"} • {nivel.sucursalId?.tipo || "TIENDA"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white block">{disp} disp.</span>
                          <span className="text-[10px] text-gray-400">
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
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span>💰</span> Análisis Financiero y CPP
                  </h4>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    Solo Administrador
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Costo Promedio Ponderado (BOB):</span>
                    <span className="font-bold text-emerald-300 font-mono text-sm">
                      {formatMoney(precioCosto)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Equivalente Moneda Extranjera:</span>
                    <div className="text-right font-mono text-[11px] text-gray-300">
                      <div>${costoUSD} USD <span className="text-gray-500">(TC 6.96)</span></div>
                      <div>S/ {costoPEN} PEN <span className="text-gray-500">(TC {tipoCambioOficial})</span></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Precio de Venta al Público:</span>
                    <span className="font-bold text-white font-mono text-sm">
                      {formatMoney(precioVenta)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Margen de Ganancia Unitario:</span>
                    <div className="text-right">
                      <span className="font-bold text-teal-300 font-mono block">
                        {formatMoney(gananciaBruta)}
                      </span>
                      <span className="text-[10px] text-teal-400 font-semibold">
                        ({margenPorcentaje.toFixed(1)}% margen)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1.5 pt-2">
                    <span className="text-gray-400">Capital Invertido en Stock:</span>
                    <span className="font-extrabold text-emerald-400 font-mono text-sm">
                      {formatMoney(valorTotalStock)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-gray-400 flex items-center justify-between">
                <span>Precio de venta sugerido:</span>
                <span className="font-bold text-white font-mono text-sm">
                  {formatMoney(precioVenta)}
                </span>
              </div>
            )}
          </div>

          {/* FOOTER DE ACCIONES */}
          <div className="p-4 border-t border-white/10 bg-slate-900 flex items-center justify-between gap-3">
            {isAdmin && (
              <Link
                href={`/dashboard/admin/inventario/kardex?productoId=${producto._id}`}
                className="px-3.5 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold transition inline-flex items-center gap-1.5"
              >
                <span>📊</span> Ver Kardex
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition ml-auto cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
