"use client";

import { useState, useMemo } from "react";
import type { Sucursal } from "@/types/sucursal";
import type { Producto, Variante } from "@/types/producto";
import { formatMoney } from "@/utils/pricing";
import { toast } from "sonner";
import TraspasoThumb from "./TraspasoThumb";

interface DraftItem {
  productoId: string;
  productoNombre: string;
  modelo: string;
  sku: string;
  varianteId: string;
  color: string;
  talla: string;
  imagen?: string;
  costoUnitarioCPP: number;
  cantidadEnviada: number;
  stockDisponibleOrigen: number;
}

interface NuevoTraspasoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sucursales: Sucursal[];
  productos: Producto[];
  onCreated: () => Promise<void>;
  onSubmit: (data: {
    sucursalOrigenId: string;
    sucursalDestinoId: string;
    motivo: string;
    notasEnvio: string;
    items: Array<{
      productoId: string;
      varianteId: string;
      cantidadEnviada: number;
    }>;
  }) => Promise<void>;
}

const MOTIVOS_RAPIDOS = [
  "Reabastecimiento de tienda",
  "Stock para fin de semana",
  "Lanzamiento de nuevo modelo",
  "Traslado por rotación de temporada",
  "Ajuste y balance de inventario",
];

export default function NuevoTraspasoModal({
  isOpen,
  onClose,
  sucursales,
  productos,
  onCreated,
  onSubmit,
}: NuevoTraspasoModalProps) {
  // Sucursales
  const [origenId, setOrigenId] = useState<string>(() => {
    const principal = sucursales.find((s) => s.esAlmacenPrincipal) || sucursales[0];
    return principal?._id || "";
  });

  const [destinoId, setDestinoId] = useState<string>(() => {
    const sec = sucursales.find((s) => !s.esAlmacenPrincipal) || sucursales[1];
    return sec?._id || "";
  });

  const [motivo, setMotivo] = useState("Reabastecimiento de tienda");
  const [notasEnvio, setNotasEnvio] = useState("");
  const [itemsDraft, setItemsDraft] = useState<DraftItem[]>([]);

  // Buscador y seleccion
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProdId, setSelectedProdId] = useState("");
  const [selectedVarId, setSelectedVarId] = useState("");
  const [cantidadAdd, setCantidadAdd] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sucursal seleccionada
  const sucursalOrigen = sucursales.find((s) => s._id === origenId);
  const sucursalDestino = sucursales.find((s) => s._id === destinoId);

  // Filtrado de productos para el selector
  const productosFiltrados = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return productos.slice(0, 30);
    return productos
      .filter((p) => {
        const nom = (p.nombre || "").toLowerCase();
        const mod = (p.modelo || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const cat = (p.categoria || "").toLowerCase();
        return nom.includes(q) || mod.includes(q) || sku.includes(q) || cat.includes(q);
      })
      .slice(0, 30);
  }, [productos, searchQuery]);

  // Producto actual seleccionado
  const productoActual = useMemo(
    () => productos.find((p) => p._id === selectedProdId),
    [productos, selectedProdId]
  );

  // Variante actual seleccionada
  const varianteActual = useMemo(
    () => productoActual?.variantes?.find((v) => v.varianteId === selectedVarId),
    [productoActual, selectedVarId]
  );

  // Calcular stock disponible en la sucursal de origen para una variante
  const getStockOrigenForVariant = (v: Variante) => {
    if (!origenId) return 0;
    const branchInfo = v.sucursalesStock?.find((s) => s.sucursalId === origenId);
    if (branchInfo) return Math.max(0, branchInfo.stockDisponible);
    // Fallback si no viene discriminado por sucursal
    return Math.max(0, v.stockDisponible ?? v.stock ?? 0);
  };

  const stockDisponibleVarActual = varianteActual
    ? getStockOrigenForVariant(varianteActual)
    : 0;

  // Imagen del producto para preview
  const getProductImage = (p: Producto, v?: Variante) => {
    return (
      v?.imagenes?.[0] ||
      (v as Record<string, unknown> | undefined)?.imagen as string ||
      p.variantes?.find((varItem) => (varItem.imagenes && varItem.imagenes.length > 0))?.imagenes?.[0] ||
      (p as unknown as { imagenes?: string[]; imagen?: string }).imagenes?.[0] ||
      (p as unknown as { imagenes?: string[]; imagen?: string }).imagen ||
      undefined
    );
  };

  // Añadir ítem a la lista borrador
  const handleAddItem = () => {
    if (!productoActual || !varianteActual || !varianteActual.varianteId) {
      toast.error("Selecciona una variante");
      return;
    }

    if (cantidadAdd <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    const stockDisp = getStockOrigenForVariant(varianteActual);
    const existing = itemsDraft.find((i) => i.varianteId === varianteActual.varianteId);
    const currentInDraft = existing ? existing.cantidadEnviada : 0;
    const requestedTotal = currentInDraft + cantidadAdd;

    if (requestedTotal > stockDisp) {
      toast.error(
        `Stock insuficiente en ${sucursalOrigen?.nombre || "origen"}. Disponible: ${stockDisp} u. (Ya tienes ${currentInDraft} en la lista)`
      );
      return;
    }

    // Costo CPP
    const costoUnit = Number(
      varianteActual.precioCosto !== undefined && varianteActual.precioCosto !== null && Number(varianteActual.precioCosto) > 0
        ? varianteActual.precioCosto
        : productoActual.precioCosto || 0
    );

    const resolvedImage = getProductImage(productoActual, varianteActual);

    if (existing) {
      setItemsDraft(
        itemsDraft.map((i) =>
          i.varianteId === varianteActual.varianteId
            ? { ...i, cantidadEnviada: requestedTotal }
            : i
        )
      );
    } else {
      setItemsDraft([
        ...itemsDraft,
        {
          productoId: productoActual._id,
          productoNombre: productoActual.nombre,
          modelo: productoActual.modelo || "",
          sku: productoActual.sku || "",
          varianteId: varianteActual.varianteId,
          color: varianteActual.color,
          talla: varianteActual.talla,
          imagen: resolvedImage,
          costoUnitarioCPP: costoUnit,
          cantidadEnviada: cantidadAdd,
          stockDisponibleOrigen: stockDisp,
        },
      ]);
    }

    toast.success(`Añadido: ${productoActual.nombre} (${varianteActual.color} - ${varianteActual.talla})`);
    setCantidadAdd(1);
  };

  // Actualizar cantidad directamente en el borrador
  const handleUpdateDraftQty = (varianteId: string, delta: number) => {
    setItemsDraft((prev) =>
      prev
        .map((it) => {
          if (it.varianteId !== varianteId) return it;
          const nextQty = it.cantidadEnviada + delta;
          if (nextQty <= 0) return null;
          if (nextQty > it.stockDisponibleOrigen) {
            toast.error(`Máximo stock disponible en origen alcanzado (${it.stockDisponibleOrigen} u.)`);
            return it;
          }
          return { ...it, cantidadEnviada: nextQty };
        })
        .filter(Boolean) as DraftItem[]
    );
  };

  const handleRemoveDraftItem = (varianteId: string) => {
    setItemsDraft((prev) => prev.filter((i) => i.varianteId !== varianteId));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!origenId || !destinoId) {
      setErrorMsg("Debes seleccionar una sucursal de origen y una de destino");
      return;
    }

    if (origenId === destinoId) {
      setErrorMsg("La sucursal de origen y destino deben ser diferentes");
      return;
    }

    if (itemsDraft.length === 0) {
      setErrorMsg("Debes agregar al menos una prenda al traspaso");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        sucursalOrigenId: origenId,
        sucursalDestinoId: destinoId,
        motivo: motivo.trim() || "Traspaso de mercadería",
        notasEnvio: notasEnvio.trim(),
        items: itemsDraft.map((i) => ({
          productoId: i.productoId,
          varianteId: i.varianteId,
          cantidadEnviada: i.cantidadEnviada,
        })),
      });

      toast.success("¡Traspaso creado exitosamente!");
      await onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear el traspaso";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Totales borrador
  const totalPrendasDraft = itemsDraft.reduce((acc, i) => acc + i.cantidadEnviada, 0);
  const totalCostoDraft = itemsDraft.reduce((acc, i) => acc + i.cantidadEnviada * i.costoUnitarioCPP, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/40">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Nueva Transferencia de Stock
              </h2>
              <p className="text-xs text-slate-400">
                Mueve mercadería entre tiendas y almacenes con control visual y CPP.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rutas (Origen ➔ Destino) */}
          <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                1. Configuración de Ruta
              </span>
              <span className="text-[11px] text-slate-400">
                El stock físico se descontará de la sucursal de origen
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Origen */}
              <div>
                <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                  Sucursal Origen (Sale stock) *
                </label>
                <select
                  value={origenId}
                  onChange={(e) => {
                    setOrigenId(e.target.value);
                    // Si el destino es igual, cambiarlo
                    if (e.target.value === destinoId) {
                      const other = sucursales.find((s) => s._id !== e.target.value);
                      if (other) setDestinoId(other._id);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm font-medium"
                >
                  {sucursales.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.nombre} ({s.codigo}) {s.esAlmacenPrincipal ? "⭐ [Almacén Central]" : ""}
                    </option>
                  ))}
                </select>
                {sucursalOrigen && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ubicación: {sucursalOrigen.direccion || "Sucursal activa"}
                  </p>
                )}
              </div>

              {/* Destino */}
              <div>
                <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1.5">
                  Sucursal Destino (Entra stock) *
                </label>
                <select
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm font-medium"
                >
                  {sucursales.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.nombre} ({s.codigo}) {s.esAlmacenPrincipal ? "⭐ [Almacén Central]" : ""}
                    </option>
                  ))}
                </select>
                {sucursalDestino && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ubicación: {sucursalDestino.direccion || "Sucursal destino"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Selector Visual de Productos y Variantes */}
          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  2. Selección de Productos & Variantes
                </span>
                <span className="text-[11px] text-slate-400">
                  Busca prendas y verifica el stock disponible en {sucursalOrigen?.nombre || "origen"}.
                </span>
              </div>

              {/* Buscador de producto */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Buscar por nombre, modelo, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                />
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Grid o Selector de Productos filtrados */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Selecciona la prenda a transferir:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                {productosFiltrados.map((p) => {
                  const isSelected = p._id === selectedProdId;
                  const thumb = getProductImage(p);

                  return (
                    <div
                      key={p._id}
                      onClick={() => {
                        setSelectedProdId(p._id);
                        // Autoseleccionar primera variante con stock si existe
                        const firstWithStock = p.variantes?.find((v) => getStockOrigenForVariant(v) > 0);
                        setSelectedVarId(firstWithStock?.varianteId || p.variantes?.[0]?.varianteId || "");
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 select-none ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/15 ring-2 ring-cyan-500/30"
                          : "border-white/10 bg-slate-800/60 hover:bg-slate-800 hover:border-white/20"
                      }`}
                    >
                      <TraspasoThumb src={thumb} alt={p.nombre} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate leading-tight">
                          {p.nombre}
                        </p>
                        {p.modelo && (
                          <span className="inline-block text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/40 mt-0.5">
                            {p.modelo}
                          </span>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                          {p.sku}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Variantes del Producto Seleccionado */}
            {productoActual && (
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Variantes de {productoActual.nombre}
                    </span>
                    {productoActual.modelo && (
                      <span className="text-xs font-mono text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                        Mod: {productoActual.modelo}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Stock en {sucursalOrigen?.nombre || "origen"}:
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {productoActual.variantes?.map((v) => {
                    const isSelected = v.varianteId === selectedVarId;
                    const stockOrigen = getStockOrigenForVariant(v);
                    const hasStock = stockOrigen > 0;
                    const vThumb = getProductImage(productoActual, v);

                    return (
                      <button
                        type="button"
                        key={v.varianteId}
                        onClick={() => setSelectedVarId(v.varianteId || "")}
                        disabled={!hasStock}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/20 shadow-md ring-2 ring-cyan-500/40 text-white"
                            : hasStock
                            ? "border-white/10 bg-slate-800 hover:bg-slate-700/80 text-slate-200"
                            : "border-white/5 bg-slate-900/40 opacity-50 cursor-not-allowed text-slate-500"
                        }`}
                      >
                        <TraspasoThumb src={vThumb} alt={v.color} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate leading-tight">
                            {v.color}
                          </p>
                          <div className="flex items-center justify-between gap-1 mt-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white">
                              {v.talla}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                hasStock ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {hasStock ? `${stockOrigen} un.` : "Agotado"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Controles de Cantidad y Boton Añadir */}
                {varianteActual && (
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                    <div className="flex items-center gap-3">
                      <TraspasoThumb
                        src={getProductImage(productoActual, varianteActual)}
                        alt={varianteActual.color}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-bold text-white">
                          {productoActual.nombre} — {varianteActual.color} ({varianteActual.talla})
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Disponible en origen:{" "}
                          <span className="font-bold text-emerald-400">
                            {stockDisponibleVarActual} unidades
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Stepper */}
                      <div className="flex items-center border border-white/15 rounded-xl bg-slate-900 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setCantidadAdd((prev) => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={stockDisponibleVarActual}
                          value={cantidadAdd}
                          onChange={(e) =>
                            setCantidadAdd(
                              Math.max(1, Math.min(stockDisponibleVarActual, Number(e.target.value) || 1))
                            )
                          }
                          className="w-14 text-center py-1.5 bg-transparent text-white font-bold text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setCantidadAdd((prev) => Math.min(stockDisponibleVarActual, prev + 1))
                          }
                          className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Botón Máx */}
                      {stockDisponibleVarActual > 1 && (
                        <button
                          type="button"
                          onClick={() => setCantidadAdd(stockDisponibleVarActual)}
                          className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-cyan-300 border border-white/10 cursor-pointer"
                        >
                          Máx
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={stockDisponibleVarActual <= 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-950/40 transition disabled:opacity-50 cursor-pointer"
                      >
                        <span>+ Añadir al Envío</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Borrador de Prendas a Enviar */}
          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  3. Prendas en esta Transferencia ({itemsDraft.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Revisa las cantidades y modelos antes de confirmar el traspaso.
                </span>
              </div>

              {itemsDraft.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItemsDraft([])}
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  Vaciar lista
                </button>
              )}
            </div>

            {itemsDraft.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                <p className="text-3xl mb-1">📦</p>
                <p className="text-sm font-medium text-slate-300">Aún no has agregado prendas</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona productos y variantes arriba para armar el paquete de transferencia.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="border border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300">
                      <thead className="bg-slate-950/70 border-b border-white/10 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3 text-left">Prenda</th>
                          <th className="px-4 py-3 text-left">Variante</th>
                          <th className="px-4 py-3 text-center">Cantidad</th>
                          <th className="px-4 py-3 text-right">Costo CPP</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                          <th className="px-4 py-3 text-center">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {itemsDraft.map((item) => (
                          <tr key={item.varianteId} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <TraspasoThumb
                                  src={item.imagen}
                                  alt={item.productoNombre}
                                  size="sm"
                                />
                                <div>
                                  <p className="font-semibold text-white leading-tight">
                                    {item.productoNombre}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {item.modelo && (
                                      <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                        Mod: {item.modelo}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {item.sku}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-200">{item.color}</span>
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/10 text-white font-bold text-[10px]">
                                {item.talla}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center border border-white/15 rounded-lg bg-slate-900 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDraftQty(item.varianteId, -1)}
                                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-bold text-white">
                                  {item.cantidadEnviada}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDraftQty(item.varianteId, 1)}
                                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right text-slate-400 font-mono">
                              {formatMoney(item.costoUnitarioCPP)}
                            </td>

                            <td className="px-4 py-3 text-right font-bold text-cyan-300 font-mono">
                              {formatMoney(item.cantidadEnviada * item.costoUnitarioCPP)}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDraftItem(item.varianteId)}
                                className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Quitar ítem"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className="px-4 py-3 bg-slate-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400">
                      Total a transferir:{" "}
                      <strong className="text-white font-bold">{totalPrendasDraft} prendas</strong> en{" "}
                      {itemsDraft.length} variantes
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Valorización CPP estimada:</span>
                      <span className="font-bold text-cyan-300 text-sm font-mono">
                        {formatMoney(totalCostoDraft)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Motivo y Notas */}
          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              4. Motivo & Instrucciones de Entrega
            </span>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Motivo del Traspaso *
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Reabastecimiento de tienda, Solicitud por alta demanda..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
              />

              {/* Pills de motivos rapidos */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {MOTIVOS_RAPIDOS.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMotivo(m)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Notas de Envío / Instrucciones al Chofer o Encargado
              </label>
              <textarea
                rows={2}
                value={notasEnvio}
                onChange={(e) => setNotasEnvio(e.target.value)}
                placeholder="Detalles sobre bultos, chofer asignado, precintos de seguridad o caja de embalaje..."
                className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Footer sticky */}
        <div className="px-5 py-4 border-t border-white/10 bg-slate-950 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
          <div className="text-xs">
            <span className="text-slate-400">Resumen: </span>
            <span className="font-bold text-white">{totalPrendasDraft} prendas</span>
            <span className="text-slate-500"> • </span>
            <span className="font-bold text-cyan-300 font-mono">{formatMoney(totalCostoDraft)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || itemsDraft.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-950/40 transition disabled:opacity-50 active:scale-98 cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>Registrando Traspaso...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Crear Traspaso ({totalPrendasDraft} prendas)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
