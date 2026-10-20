"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { Pedido } from "@/types/pedido";
import type { Producto } from "@/types/producto";
import type { CuentaDinero } from "@/types/cuentaDinero";
import type { DestinoFisicoItem, TipoOperacionDevolucion } from "@/types/devolucionCambio";
import { getProductos } from "@/services/producto.service";
import { formatMoney } from "@/utils/pricing";

interface DevolucionCambioModalProps {
  pedido: Pedido;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ItemDevolucionState {
  productoId: string;
  varianteId: string;
  nombre: string;
  color: string;
  talla: string;
  cantidadMax: number;
  cantidadDevolver: number;
  precioUnitario: number;
  precioCosto?: number;
  destinoFisico: DestinoFisicoItem;
  motivo: string;
  seleccionado: boolean;
}

interface ItemNuevoCambio {
  productoId: string;
  varianteId: string;
  nombre: string;
  color: string;
  talla: string;
  cantidad: number;
  precioUnitario: number;
  precioCosto?: number;
}

export default function DevolucionCambioModal({
  pedido,
  onClose,
  onSuccess,
}: DevolucionCambioModalProps) {
  const [tipoOperacion, setTipoOperacion] = useState<TipoOperacionDevolucion>("DEVOLUCION");
  const [itemsDevolucion, setItemsDevolucion] = useState<ItemDevolucionState[]>([]);
  const [itemsEntregados, setItemsEntregados] = useState<ItemNuevoCambio[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Catálogo para búsqueda en caso de Cambio
  const [productosCatalogo, setProductosCatalogo] = useState<Producto[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  // Cuentas de dinero
  const [cuentas, setCuentas] = useState<CuentaDinero[]>([]);
  const [cuentaDineroId, setCuentaDineroId] = useState("");
  const [metodoPagoDiferencia, setMetodoPagoDiferencia] = useState<"EFECTIVO" | "QR" | "TRANSFERENCIA">("EFECTIVO");

  // Inicializar items del pedido
  useEffect(() => {
    const inicial = pedido.items.map((item) => ({
      productoId: item.productoId,
      varianteId: item.variante.varianteId || "",
      nombre: item.productoSnapshot?.nombre || "Producto",
      color: item.variante.color,
      talla: item.variante.talla,
      cantidadMax: item.cantidad,
      cantidadDevolver: 1,
      precioUnitario: item.precioUnitario,
      precioCosto: item.precioCosto,
      destinoFisico: "REINGRESO_STOCK" as DestinoFisicoItem,
      motivo: "Cambio de talla / modelo",
      seleccionado: false,
    }));
    setItemsDevolucion(inicial);
  }, [pedido]);

  // Cargar catálogo de productos y cuentas de dinero
  useEffect(() => {
    getProductos({ withStock: true })
      .then(setProductosCatalogo)
      .catch(() => {});

    fetch("/api/admin/finanzas/cuentas?activa=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CuentaDinero[]) => {
        setCuentas(data);
        if (data.length > 0) setCuentaDineroId(data[0]._id);
      })
      .catch(() => {});
  }, []);

  // Totales calculados
  const totalDevuelto = useMemo(() => {
    return itemsDevolucion
      .filter((i) => i.seleccionado)
      .reduce((acc, i) => acc + i.cantidadDevolver * i.precioUnitario, 0);
  }, [itemsDevolucion]);

  const totalEntregado = useMemo(() => {
    return itemsEntregados.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
  }, [itemsEntregados]);

  const diferencia = useMemo(() => {
    if (tipoOperacion === "DEVOLUCION") {
      return -totalDevuelto;
    }
    return Number((totalEntregado - totalDevuelto).toFixed(2));
  }, [tipoOperacion, totalDevuelto, totalEntregado]);

  // Manejo de selección de ítems
  const handleToggleItem = (index: number) => {
    setItemsDevolucion((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, seleccionado: !item.seleccionado } : item))
    );
  };

  const handleUpdateItem = (index: number, fields: Partial<ItemDevolucionState>) => {
    setItemsDevolucion((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...fields } : item))
    );
  };

  // Manejo de ítems entregados en cambio
  const handleAddVarianteCambio = (prod: Producto, varianteId: string) => {
    const v = (prod.variantes || []).find((varItem) => varItem.varianteId === varianteId);
    if (!v) return;

    const precioVenta = v.precioVenta || prod.precioVenta || 0;
    const precioCosto = v.precioCosto || prod.precioCosto || 0;

    setItemsEntregados((prev) => {
      const existe = prev.find((i) => i.varianteId === varianteId);
      if (existe) {
        return prev.map((i) => (i.varianteId === varianteId ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [
        ...prev,
        {
          productoId: prod._id,
          varianteId: v.varianteId || "",
          nombre: prod.nombre,
          color: v.color,
          talla: v.talla,
          cantidad: 1,
          precioUnitario: precioVenta,
          precioCosto,
        },
      ];
    });
  };

  const handleRemoveItemEntregado = (varianteId: string) => {
    setItemsEntregados((prev) => prev.filter((i) => i.varianteId !== varianteId));
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const seleccionados = itemsDevolucion.filter((i) => i.seleccionado);
    if (seleccionados.length === 0) {
      toast.error("Selecciona al menos una prenda para devolver");
      return;
    }

    if (tipoOperacion === "CAMBIO" && itemsEntregados.length === 0) {
      toast.error("Agrega las prendas nuevas que se entregarán al cliente");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        tipo: tipoOperacion,
        itemsDevueltos: seleccionados.map((i) => ({
          productoId: i.productoId,
          varianteId: i.varianteId,
          nombre: i.nombre,
          color: i.color,
          talla: i.talla,
          cantidad: i.cantidadDevolver,
          precioUnitario: i.precioUnitario,
          precioCosto: i.precioCosto,
          destinoFisico: i.destinoFisico,
          motivo: i.motivo,
        })),
        itemsEntregados:
          tipoOperacion === "CAMBIO"
            ? itemsEntregados.map((i) => ({
                productoId: i.productoId,
                varianteId: i.varianteId,
                nombre: i.nombre,
                color: i.color,
                talla: i.talla,
                cantidad: i.cantidad,
                precioUnitario: i.precioUnitario,
                precioCosto: i.precioCosto,
              }))
            : [],
        cuentaDineroId: cuentaDineroId || undefined,
        metodoPagoDiferencia,
        observaciones: observaciones.trim() || undefined,
      };

      const res = await fetch(`/api/pedidos/${pedido._id}/devoluciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Error al procesar devolución");
      }

      toast.success(
        `Operación ${data.numeroOperacion} registrada con éxito. ${
          data.accionMonetaria === "REEMBOLSO_CLIENTE"
            ? `Reembolso de Bs ${Math.abs(data.diferenciaMonto).toFixed(2)} procesado.`
            : data.accionMonetaria === "COBRO_ADICIONAL"
            ? `Cobro de Bs ${data.diferenciaMonto.toFixed(2)} registrado.`
            : "Cambio a la par registrado."
        }`
      );

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar devolución");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md animate-fadeIn">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl flex items-center gap-2">
              <span>🔄</span> Devolución o Cambio de Prenda
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Pedido <strong className="text-cyan-700 dark:text-cyan-300">{pedido.numeroPedido}</strong> •{" "}
              {new Date(pedido.createdAt).toLocaleDateString("es-BO")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Formulario con Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Selector de Tipo de Operación */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-2">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoOperacion("DEVOLUCION")}
                className={`flex flex-col items-center justify-center rounded-xl p-3 border text-xs font-bold transition ${
                  tipoOperacion === "DEVOLUCION"
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 shadow-md"
                    : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span className="text-lg mb-1">💸</span>
                <span>Devolución con Reembolso</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-gray-300">
                  El cliente entrega la prenda y recibe dinero
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTipoOperacion("CAMBIO")}
                className={`flex flex-col items-center justify-center rounded-xl p-3 border text-xs font-bold transition ${
                  tipoOperacion === "CAMBIO"
                    ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 shadow-md"
                    : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span className="text-lg mb-1">🔁</span>
                <span>Cambio de Prenda (Talla/Modelo)</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-gray-300">
                  Devuelve una prenda y se lleva otra (± diferencia)
                </span>
              </button>
            </div>
          </div>

          {/* 1. Prendas a Devolver */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
              1. Selecciona las Prendas Devueltas por el Cliente
            </h3>

            <div className="space-y-2">
              {itemsDevolucion.map((item, idx) => (
                <div
                  key={`${item.varianteId}-${idx}`}
                  className={`rounded-xl border p-3 transition ${
                    item.seleccionado
                      ? "border-amber-400/80 bg-amber-50/70 dark:border-amber-500/50 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/60 opacity-80"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.seleccionado}
                      onChange={() => handleToggleItem(idx)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-cyan-500"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{item.nombre}</p>
                        <p className="font-black text-slate-900 dark:text-white text-xs">{formatMoney(item.precioUnitario)} c/u</p>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-gray-400">
                        {item.color} • Talla {item.talla} (Comprado: {item.cantidadMax} u.)
                      </p>

                      {item.seleccionado && (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 pt-2 border-t border-slate-200 dark:border-white/10">
                          <div>
                            <label className="block text-[10px] text-slate-600 dark:text-gray-400 mb-1">Cantidad a devolver</label>
                            <input
                              type="number"
                              min="1"
                              max={item.cantidadMax}
                              value={item.cantidadDevolver}
                              onChange={(e) =>
                                handleUpdateItem(idx, {
                                  cantidadDevolver: Math.min(
                                    item.cantidadMax,
                                    Math.max(1, parseInt(e.target.value, 10) || 1)
                                  ),
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-600 dark:text-gray-400 mb-1">Destino de la Prenda</label>
                            <select
                              value={item.destinoFisico}
                              onChange={(e) =>
                                handleUpdateItem(idx, {
                                  destinoFisico: e.target.value as DestinoFisicoItem,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                            >
                              <option value="REINGRESO_STOCK">Reingreso a Stock (Intacta)</option>
                              <option value="MERMA_DANADO">Merma / Defectuosa (Baja)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-600 dark:text-gray-400 mb-1">Motivo</label>
                            <select
                              value={item.motivo}
                              onChange={(e) => handleUpdateItem(idx, { motivo: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                            >
                              <option value="Talla incorrecta">Talla incorrecta</option>
                              <option value="Cambio de modelo/color">Cambio de modelo/color</option>
                              <option value="Falla de costura/tela">Falla de costura/tela (Merma)</option>
                              <option value="Arrepentimiento cliente">Arrepentimiento de compra</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-right text-xs font-semibold text-amber-700 dark:text-amber-300">
              Valor de lo devuelto: <strong>{formatMoney(totalDevuelto)}</strong>
            </p>
          </div>

          {/* 2. Prendas Nuevas Entregadas (Solo si es Cambio) */}
          {tipoOperacion === "CAMBIO" && (
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                2. Selecciona las Nuevas Prendas que se Entregan al Cliente
              </h3>

              {/* Buscador de Producto en Catálogo */}
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/80 p-3 space-y-2">
                <input
                  type="text"
                  placeholder="Buscar prenda nueva por nombre o modelo..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                />

                {busquedaProducto.trim().length > 1 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {productosCatalogo
                      .filter((p) =>
                        p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
                      )
                      .slice(0, 5)
                      .map((p) => (
                        <div
                          key={p._id}
                          onClick={() => {
                            setProductoSeleccionado(p);
                            setBusquedaProducto("");
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-700 cursor-pointer text-xs text-slate-900 dark:text-white transition"
                        >
                          <span className="font-semibold">{p.nombre}</span>
                          <span className="text-cyan-700 dark:text-cyan-400 font-bold">{formatMoney(p.precioVenta)}</span>
                        </div>
                      ))}
                  </div>
                )}

                {productoSeleccionado && (
                  <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 space-y-1">
                    <p className="text-xs font-bold text-cyan-800 dark:text-cyan-300">
                      Variantes de {productoSeleccionado.nombre}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {productoSeleccionado.variantes?.map((v) => (
                        <button
                          key={v.varianteId}
                          type="button"
                          onClick={() => handleAddVarianteCambio(productoSeleccionado, v.varianteId || "")}
                          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-700 dark:text-gray-200 hover:bg-cyan-600 hover:text-white transition"
                        >
                          {v.color} - T.{v.talla} (Stock {v.stockDisponible ?? v.stock ?? 0}) +
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Prendas Nuevas Agregadas */}
              {itemsEntregados.length > 0 && (
                <div className="space-y-1">
                  {itemsEntregados.map((it) => (
                    <div
                      key={it.varianteId}
                      className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 p-2 text-xs shadow-sm"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{it.nombre}</span>
                        <span className="text-slate-500 dark:text-gray-400 ml-2">
                          {it.color} • Talla {it.talla} ({it.cantidad} u.)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{formatMoney(it.cantidad * it.precioUnitario)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemEntregado(it.varianteId)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-right text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                    Valor de lo entregado: <strong>{formatMoney(totalEntregado)}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. Liquidación Monetaria & Cuenta */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/90 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
              3. Resumen y Liquidación de Caja
            </h3>

            <div className="flex items-center justify-between text-sm font-black">
              <span className="text-slate-800 dark:text-slate-200">Balance de la Operación:</span>
              <span
                className={
                  diferencia < 0
                    ? "text-amber-700 dark:text-amber-400"
                    : diferencia > 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-900 dark:text-white"
                }
              >
                {diferencia < 0
                  ? `Reembolso al Cliente: Bs ${Math.abs(diferencia).toFixed(2)}`
                  : diferencia > 0
                  ? `Cobro Adicional al Cliente: Bs ${diferencia.toFixed(2)}`
                  : "Cambio Exacto (Bs 0.00)"}
              </span>
            </div>

            {diferencia !== 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-gray-400 mb-1">
                    {diferencia < 0 ? "Cuenta de donde sale el reembolso:" : "Cuenta donde ingresa el cobro:"}
                  </label>
                  <select
                    value={cuentaDineroId}
                    onChange={(e) => setCuentaDineroId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    {cuentas.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nombre} (Saldo: Bs {c.saldoActual.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-gray-400 mb-1">Método de Pago:</label>
                  <select
                    value={metodoPagoDiferencia}
                    onChange={(e) => setMetodoPagoDiferencia(e.target.value as "EFECTIVO" | "QR" | "TRANSFERENCIA")}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="QR">Pago QR</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-gray-400 mb-1">Observaciones / Notas:</label>
              <input
                type="text"
                placeholder="Detalles sobre el motivo o estado de la prenda..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-98 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-bold text-slate-950 hover:brightness-110 disabled:opacity-50 shadow-lg shadow-amber-950/50 active:scale-98 transition"
            >
              {isSubmitting ? "Procesando..." : "Confirmar Operación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
