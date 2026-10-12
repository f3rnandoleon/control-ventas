"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearCompra } from "@/services/compras.service";
import { getProductosInventario } from "@/services/inventario.service";
import type { ProductoInventario } from "@/types/inventario";
import type { Variante } from "@/types/producto";
import { calcularCostoPromedioPonderado, formatMoney } from "@/utils/pricing";

interface FormItem {
  productoId: string;
  varianteId: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  cantidad: number;
  costoUnitarioOrigen: number;
}

export default function NuevaCompraForm() {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Cabecera
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [proveedor, setProveedor] = useState("");
  const [comprobanteReferencia, setComprobanteReferencia] = useState("");
  const [monedaOrigen, setMonedaOrigen] = useState<"PEN" | "BOB" | "USD">("PEN");
  const [tipoCambio, setTipoCambio] = useState<number>(1.85);
  const [notas, setNotas] = useState("");

  // Items
  const [items, setItems] = useState<FormItem[]>([]);

  // Item en proceso de adición
  const [selectedProductoId, setSelectedProductoId] = useState("");
  const [selectedVarianteKey, setSelectedVarianteKey] = useState("");
  const [itemCantidad, setItemCantidad] = useState<number>(10);
  const [itemCostoOrigen, setItemCostoOrigen] = useState<number>(35);

  useEffect(() => {
    const load = async () => {
      try {
        const [prods, politicasRes] = await Promise.all([
          getProductosInventario(),
          fetch("/api/public/politicas").then((r) => (r.ok ? r.json() : null)),
        ]);
        setProductos(prods);
        if (politicasRes?.tipoCambioOficial) {
          setTipoCambio(politicasRes.tipoCambioOficial);
        }
      } catch {
        toast.error("Error al cargar productos");
      } finally {
        setLoadingProductos(false);
      }
    };
    load();
  }, []);

  // Producto seleccionado para el selector
  const activeProducto = useMemo(
    () => productos.find((p) => p._id === selectedProductoId),
    [productos, selectedProductoId]
  );

  // Variantes del producto seleccionado
  const availableVariantes = useMemo(
    () => (activeProducto?.variantes || []) as Variante[],
    [activeProducto]
  );

  // Variante seleccionada
  const activeVariante = useMemo(() => {
    if (!selectedVarianteKey) return undefined;
    return availableVariantes.find(
      (v) => (v.varianteId || `${v.color}-${v.talla}`) === selectedVarianteKey
    );
  }, [availableVariantes, selectedVarianteKey]);

  // Al cambiar producto, resetear selección de variante
  const handleProductoChange = (id: string) => {
    setSelectedProductoId(id);
    const prod = productos.find((p) => p._id === id);
    if (prod && prod.variantes?.length > 0) {
      const firstV = prod.variantes[0];
      setSelectedVarianteKey(firstV.varianteId || `${firstV.color}-${firstV.talla}`);
      // Prellenar costo sugerido
      const costoSugerido = firstV.precioCosto || prod.precioCosto || 0;
      if (monedaOrigen === "PEN" && tipoCambio > 0) {
        setItemCostoOrigen(Number((costoSugerido / tipoCambio).toFixed(2)));
      } else {
        setItemCostoOrigen(costoSugerido);
      }
    } else {
      setSelectedVarianteKey("");
    }
  };

  // Preview del CPP para el ítem que se está por agregar
  const previewCPPItem = useMemo(() => {
    if (!activeProducto || !activeVariante) return null;
    const stockPrevio = activeVariante.stock || 0;
    const costoPrevioBOB = Number(
      activeVariante.precioCosto || activeProducto.precioCosto || 0
    );
    const costoNuevoBOB =
      monedaOrigen === "PEN" || monedaOrigen === "USD"
        ? Number((itemCostoOrigen * tipoCambio).toFixed(2))
        : Number(itemCostoOrigen.toFixed(2));

    const nuevoCPP = calcularCostoPromedioPonderado(
      stockPrevio,
      costoPrevioBOB,
      itemCantidad,
      costoNuevoBOB
    );

    return {
      stockPrevio,
      costoPrevioBOB,
      costoNuevoBOB,
      nuevoStock: stockPrevio + itemCantidad,
      nuevoCPP,
    };
  }, [
    activeProducto,
    activeVariante,
    itemCantidad,
    itemCostoOrigen,
    monedaOrigen,
    tipoCambio,
  ]);

  const handleAddItem = () => {
    if (!activeProducto || !activeVariante) {
      toast.error("Selecciona un producto y una variante");
      return;
    }
    if (itemCantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    if (itemCostoOrigen <= 0) {
      toast.error("El costo debe ser mayor a 0");
      return;
    }

    const varianteId = activeVariante.varianteId || `${activeVariante.color}-${activeVariante.talla}`;

    // Verificar si ya está en la lista de items
    const existingIndex = items.findIndex(
      (i) => i.productoId === activeProducto._id && i.varianteId === varianteId
    );

    if (existingIndex >= 0) {
      toast.error("Esta variante ya está en la lista. Puedes editar su cantidad o eliminarla.");
      return;
    }

    setItems([
      ...items,
      {
        productoId: activeProducto._id,
        varianteId,
        color: activeVariante.color,
        colorSecundario: activeVariante.colorSecundario,
        talla: activeVariante.talla,
        cantidad: itemCantidad,
        costoUnitarioOrigen: itemCostoOrigen,
      },
    ]);

    toast.success(`Agregado: ${activeProducto.nombre} (${activeVariante.color} - ${activeVariante.talla})`);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Totales generales
  const resumenTotales = useMemo(() => {
    let totalPrendas = 0;
    let totalOrigen = 0;
    let totalBOB = 0;

    for (const it of items) {
      totalPrendas += it.cantidad;
      const subtotalOrigen = it.cantidad * it.costoUnitarioOrigen;
      totalOrigen += subtotalOrigen;

      const costoBOB =
        monedaOrigen === "BOB"
          ? it.costoUnitarioOrigen
          : it.costoUnitarioOrigen * tipoCambio;
      totalBOB += it.cantidad * costoBOB;
    }

    return {
      totalPrendas,
      totalOrigen: Number(totalOrigen.toFixed(2)),
      totalBOB: Number(totalBOB.toFixed(2)),
    };
  }, [items, monedaOrigen, tipoCambio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Debes agregar al menos un ítem a la compra");
      return;
    }

    setSubmitting(true);
    try {
      const res = await crearCompra({
        fecha,
        proveedor: proveedor.trim() || undefined,
        comprobanteReferencia: comprobanteReferencia.trim() || undefined,
        monedaOrigen,
        tipoCambio,
        notas: notas.trim() || undefined,
        items,
      });

      toast.success(res.message || "Compra registrada correctamente");
      router.push("/dashboard/admin/inventario/compras");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al registrar la compra"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* SECCIÓN 1: DATOS GENERALES DE LA COMPRA */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_20px_rgba(0,180,255,0.08)] space-y-6">
        <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
          <span>1. Información de la Compra / Factura</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Fecha de Compra
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Proveedor / Taller
            </label>
            <input
              type="text"
              placeholder="Ej: Gamarra Lima / Taller Central"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="w-full rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Nº Comprobante / Guía / Lote
            </label>
            <input
              type="text"
              placeholder="Ej: Guía #5841 / Fardo #2"
              value={comprobanteReferencia}
              onChange={(e) => setComprobanteReferencia(e.target.value)}
              className="w-full rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Moneda de Compra
            </label>
            <div className="inline-flex w-full rounded-xl bg-gray-900 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setMonedaOrigen("PEN")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  monedaOrigen === "PEN"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                🇵🇪 Soles (PEN)
              </button>
              <button
                type="button"
                onClick={() => setMonedaOrigen("BOB")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  monedaOrigen === "BOB"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                🇧🇴 Bs (BOB)
              </button>
            </div>
          </div>
        </div>

        {monedaOrigen === "PEN" && (
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyan-200">
                Tipo de cambio aplicado para esta compra
              </p>
              <p className="text-xs text-cyan-400/80">
                1 Sol (PEN) se convertirá automáticamente a Bolivianos al valor indicado.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">1 S/. =</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={tipoCambio}
                onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 0)}
                className="w-24 rounded-lg bg-gray-900 border border-cyan-500/50 px-3 py-1.5 text-sm font-bold text-cyan-300 text-center focus:outline-none"
              />
              <span className="text-sm font-bold text-white">Bs</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Notas u Observaciones (Opcional)
          </label>
          <input
            type="text"
            placeholder="Detalles sobre el transporte, lote, confección, etc."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* SECCIÓN 2: SELECTOR Y AGREGADOR DE PRENDAS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_20px_rgba(0,180,255,0.08)] space-y-6">
        <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
          <span>2. Agregar Prendas / Modelos a la Compra</span>
        </h2>

        {loadingProductos ? (
          <div className="h-24 animate-pulse rounded-xl bg-gray-800" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Producto */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Seleccionar Producto
                </label>
                <select
                  value={selectedProductoId}
                  onChange={(e) => handleProductoChange(e.target.value)}
                  className="w-full rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">-- Elige un producto --</option>
                  {productos.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nombre} {p.modelo ? `(${p.modelo})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variante */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Variante (Color & Talla)
                </label>
                <select
                  value={selectedVarianteKey}
                  onChange={(e) => setSelectedVarianteKey(e.target.value)}
                  disabled={!selectedProductoId || availableVariantes.length === 0}
                  className="w-full rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                >
                  {availableVariantes.length === 0 ? (
                    <option value="">Sin variantes</option>
                  ) : (
                    availableVariantes.map((v) => {
                      const key = v.varianteId || `${v.color}-${v.talla}`;
                      return (
                        <option key={key} value={key}>
                          {v.color}
                          {v.colorSecundario ? ` / ${v.colorSecundario}` : ""} - Talla {v.talla} (Stock actual: {v.stock} u.)
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Cantidad que entra (u.)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={itemCantidad || ""}
                  onChange={(e) => setItemCantidad(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2.5 text-sm text-white font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Costo Unitario */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Costo Unitario ({monedaOrigen})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={itemCostoOrigen || ""}
                    onChange={(e) => setItemCostoOrigen(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl bg-gray-900 border border-white/10 px-3.5 py-2.5 text-sm text-white font-bold focus:border-cyan-500 focus:outline-none"
                  />
                  {monedaOrigen === "PEN" && (
                    <span className="absolute right-3 top-2.5 text-xs text-cyan-400 font-semibold">
                      ≈ Bs {(itemCostoOrigen * tipoCambio).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* PREVIEW EN TIEMPO REAL DEL CPP PARA ESTE ÍTEM */}
            {previewCPPItem && (
              <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-slate-900/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    Simulación de Costo Promedio Ponderado (CPP)
                  </span>
                  <p className="text-xs text-gray-300">
                    Stock actual:{" "}
                    <span className="font-semibold text-white">
                      {previewCPPItem.stockPrevio} u.
                    </span>{" "}
                    a{" "}
                    <span className="font-semibold text-white">
                      {formatMoney(previewCPPItem.costoPrevioBOB)}
                    </span>{" "}
                    | Nueva entrada:{" "}
                    <span className="font-semibold text-cyan-300">
                      +{itemCantidad} u.
                    </span>{" "}
                    a{" "}
                    <span className="font-semibold text-cyan-300">
                      {formatMoney(previewCPPItem.costoNuevoBOB)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">
                      Nuevo Costo Promedio Resultante:
                    </span>
                    <span className="text-base font-extrabold text-cyan-300">
                      {formatMoney(previewCPPItem.nuevoCPP)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md whitespace-nowrap"
                  >
                    + Agregar a la Compra
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: LISTADO DE PRENDAS DE ESTA COMPRA */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_20px_rgba(0,180,255,0.08)] space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-cyan-400">
            3. Resumen de Prendas en la Compra ({items.length})
          </h2>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setItems([])}
              className="text-xs text-red-400 hover:underline"
            >
              Vaciar lista
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 border border-dashed border-white/10 rounded-xl">
            Aún no has agregado prendas. Selecciona el modelo y presiona &quot;+ Agregar a la Compra&quot;.
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-gray-300">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left">Producto / Modelo</th>
                    <th className="px-4 py-3 text-left">Variante</th>
                    <th className="px-4 py-3 text-center">Cantidad</th>
                    <th className="px-4 py-3 text-right">Costo ({monedaOrigen})</th>
                    <th className="px-4 py-3 text-right">Costo (Bs)</th>
                    <th className="px-4 py-3 text-right">Subtotal (Bs)</th>
                    <th className="px-4 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((it, idx) => {
                    const prod = productos.find((p) => p._id === it.productoId);
                    const costoBOB =
                      monedaOrigen === "BOB"
                        ? it.costoUnitarioOrigen
                        : it.costoUnitarioOrigen * tipoCambio;
                    const subtotalBOB = it.cantidad * costoBOB;

                    return (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-semibold text-white">
                          {prod?.nombre || "Producto"}
                          {prod?.modelo && (
                            <span className="text-[10px] text-gray-400 ml-1">
                              ({prod.modelo})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-cyan-300 font-medium">
                            {it.color}
                            {it.colorSecundario ? ` / ${it.colorSecundario}` : ""} - Talla {it.talla}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-white">
                          +{it.cantidad} u.
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {monedaOrigen} {it.costoUnitarioOrigen.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-200">
                          {formatMoney(costoBOB)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">
                          {formatMoney(subtotalBOB)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Eliminar de la lista"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BARRA DE TOTALES Y BOTÓN DE CONFIRMACIÓN */}
        {items.length > 0 && (
          <div className="p-5 rounded-xl bg-gray-900 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-gray-400 block">Total Prendas</span>
                <span className="text-lg font-bold text-white">
                  {resumenTotales.totalPrendas} unidades
                </span>
              </div>
              {monedaOrigen !== "BOB" && (
                <div>
                  <span className="text-xs text-gray-400 block">
                    Total {monedaOrigen}
                  </span>
                  <span className="text-lg font-bold text-cyan-300">
                    {monedaOrigen} {resumenTotales.totalOrigen.toFixed(2)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-400 block">
                  Inversión Total (BOB)
                </span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {formatMoney(resumenTotales.totalBOB)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
            >
              {submitting
                ? "Registrando compra..."
                : "💾 Confirmar Compra y Actualizar Inventario"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
