"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Variante, Producto } from "@/types/producto";
import VarianteForm from "./VarianteForm";
import VarianteRow from "./VarianteRow";
import VarianteCard from "./VarianteCard";
import { updateProducto } from "@/services/producto.service";
import { generarPDFQrs } from "@/utils/generarPDFQrs";
import { generarPDFCodigosBarras } from "@/utils/generarPDFCodigosBarras";
import GuiaTallasModal from "./GuiaTallasModal";
import ColorSwatch from "@/components/ui/ColorSwatch";

type Mode = "LIST" | "ADD" | "EDIT";

const getVariantGroupKey = (variante: Pick<Variante, "color" | "colorSecundario">) =>
  `${variante.color.trim().toLowerCase()}::${(variante.colorSecundario || "")
    .trim()
    .toLowerCase()}`;

export default function VariantesManager({
  producto,
  onUpdated,
}: {
  producto: Producto;
  onUpdated: () => void;
}) {
  const [mode, setMode] = useState<Mode>("LIST");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGuiaTallas, setShowGuiaTallas] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroColor, setFiltroColor] = useState<string>("TODOS");

  const saveVariantes = async (variantes: Variante[]) => {
    setLoading(true);

    try {
      await updateProducto(producto._id, { variantes });
      await onUpdated();
      setMode("LIST");
      setEditingIndex(null);
      setEditingGroupKey(null);
      toast.success("Variantes actualizadas correctamente");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las variantes";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // KPIs y estadísticas resumidas
  const { totalVariantes, totalStock, coloresUnicos, variantesConQRCount, variantesConBarCodeCount } =
    useMemo(() => {
      const variantes = producto.variantes || [];
      const coloresSet = new Set<string>();
      let stockSum = 0;
      let qrCount = 0;
      let barCount = 0;

      for (const v of variantes) {
        if (v.color) coloresSet.add(v.color.trim());
        stockSum += v.stock || 0;
        if (v.qrCode) qrCount++;
        if (v.codigoBarra) barCount++;
      }

      return {
        totalVariantes: variantes.length,
        totalStock: stockSum,
        coloresUnicos: Array.from(coloresSet).sort(),
        variantesConQRCount: qrCount,
        variantesConBarCodeCount: barCount,
      };
    }, [producto.variantes]);

  // Filtrado reactivo en móvil y escritorio
  const variantesFiltradas = useMemo(() => {
    let list = producto.variantes || [];

    if (filtroColor !== "TODOS") {
      list = list.filter(
        (v) => (v.color || "").trim().toLowerCase() === filtroColor.toLowerCase()
      );
    }

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((v) => {
        const terms = [
          v.color,
          v.colorSecundario || "",
          v.talla,
          v.codigoBarra || "",
          v.qrCode || "",
          v.descripcion || "",
        ]
          .join(" ")
          .toLowerCase();

        return terms.includes(query);
      });
    }

    return list;
  }, [producto.variantes, filtroColor, search]);

  /* =========================
     ADD / EDIT VIEW
  ========================= */
  if (mode === "ADD" || mode === "EDIT") {
    const variantesDelGrupo =
      mode === "EDIT" && editingGroupKey
        ? producto.variantes.filter(
            (variante) => getVariantGroupKey(variante) === editingGroupKey
          )
        : [];

    return (
      <div className="w-full max-w-full space-y-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-sky-700 dark:text-cyan-400">
              {mode === "ADD" ? "➕ Agregar nuevas variantes" : "✏️ Editar variantes del color"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              {producto.nombre} {producto.modelo && `• ${producto.modelo}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode("LIST");
              setEditingIndex(null);
              setEditingGroupKey(null);
            }}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 font-medium transition"
          >
            ← Volver a la lista
          </button>
        </div>

        <VarianteForm
          initialData={
            mode === "EDIT" && editingIndex !== null
              ? producto.variantes[editingIndex]
              : undefined
          }
          initialVariantes={mode === "EDIT" ? variantesDelGrupo : undefined}
          existingVariantes={producto.variantes}
          precioBaseVenta={producto.precioVenta}
          precioBaseCosto={producto.precioCosto}
          onSave={(data) => {
            if (mode === "EDIT" && editingGroupKey) {
              let inserted = false;
              const nuevas = producto.variantes.flatMap((variante) => {
                if (getVariantGroupKey(variante) !== editingGroupKey) {
                  return [variante];
                }

                if (inserted) {
                  return [];
                }

                inserted = true;
                return data;
              });

              saveVariantes(nuevas);
              return;
            }

            const nuevas = [...producto.variantes];
            if (mode === "ADD") {
              nuevas.push(...data);
            }

            saveVariantes(nuevas);
          }}
          onCancel={() => {
            setMode("LIST");
            setEditingIndex(null);
            setEditingGroupKey(null);
          }}
        />

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-sky-600 dark:text-cyan-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Guardando variantes...</span>
          </div>
        )}
      </div>
    );
  }

  /* =========================
     LIST VIEW
  ========================= */
  return (
    <div className="w-full max-w-full space-y-4">
      {/* Resumen KPI y Contexto del Producto */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-sky-700 bg-sky-100 dark:text-cyan-400 dark:bg-cyan-950/60 dark:border dark:border-cyan-500/30 px-2 py-0.5 rounded">
                SKU: {producto.sku}
              </span>
              {producto.categoria && (
                <span className="text-xs font-medium text-slate-600 bg-slate-200/70 dark:text-gray-300 dark:bg-white/10 px-2 py-0.5 rounded">
                  {producto.categoria}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1">
              {producto.nombre}
            </h2>
          </div>

          {/* Chips de KPIs compactos */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm text-center">
              <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-medium uppercase">
                Variantes
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {totalVariantes}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 shadow-sm text-center">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-medium uppercase">
                Stock Total
              </span>
              <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                {totalStock} u.
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm text-center">
              <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-medium uppercase">
                Colores
              </span>
              <span className="text-sm font-extrabold text-sky-700 dark:text-cyan-400">
                {coloresUnicos.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Acciones Globales: Totalmente responsiva para móvil */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        <button
          type="button"
          className="col-span-2 sm:col-span-1 flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm px-4 py-2.5 shadow-md shadow-sky-500/20 active:scale-95 transition cursor-pointer"
          onClick={() => {
            setEditingIndex(null);
            setEditingGroupKey(null);
            setMode("ADD");
          }}
        >
          <span>➕</span>
          <span>Agregar variantes</span>
        </button>

        <button
          type="button"
          disabled={variantesConQRCount === 0}
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-gray-200 font-semibold text-xs px-3 py-2 transition active:scale-95 disabled:opacity-40 cursor-pointer shadow-sm"
          onClick={() => {
            const variantesConQR = producto.variantes
              .filter((v) => v.qrCode)
              .map((v) => ({
                codigo: v.qrCode!,
              }));

            if (variantesConQR.length === 0) return;

            generarPDFQrs(variantesConQR, `QR Variantes - ${producto.nombre}`);
          }}
          title="Generar PDF con los códigos QR de todas las variantes"
        >
          <span>📱</span>
          <span>QR ({variantesConQRCount})</span>
        </button>

        <button
          type="button"
          disabled={variantesConBarCodeCount === 0}
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-gray-200 font-semibold text-xs px-3 py-2 transition active:scale-95 disabled:opacity-40 cursor-pointer shadow-sm"
          onClick={() => {
            const variantesConCodigo = producto.variantes
              .filter((v) => v.codigoBarra)
              .map((v) => ({
                codigo: v.codigoBarra!,
              }));

            if (variantesConCodigo.length === 0) return;

            generarPDFCodigosBarras(
              variantesConCodigo,
              `Códigos de barras - ${producto.nombre}`
            );
          }}
          title="Generar PDF con códigos de barra de todas las variantes"
        >
          <span>🏷️</span>
          <span>Barras ({variantesConBarCodeCount})</span>
        </button>

        <button
          type="button"
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-gray-200 font-semibold text-xs px-3 py-2 transition active:scale-95 cursor-pointer shadow-sm"
          onClick={() => setShowGuiaTallas(true)}
        >
          <span>📏</span>
          <span>Guía de tallas</span>
        </button>
      </div>

      {/* Buscador y Filtro por Color (Ideal en pantallas móviles) */}
      {totalVariantes > 0 && (
        <div className="space-y-2 pt-1">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por color, talla, código..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-400 shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros rápidos por color */}
          {coloresUnicos.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[11px] text-slate-400 shrink-0 font-medium mr-1">
                Color:
              </span>
              <button
                type="button"
                onClick={() => setFiltroColor("TODOS")}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                  filtroColor === "TODOS"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                Todos ({totalVariantes})
              </button>
              {coloresUnicos.map((color) => {
                const count = producto.variantes.filter(
                  (v) => (v.color || "").trim().toLowerCase() === color.toLowerCase()
                ).length;
                const isSelected = filtroColor.toLowerCase() === color.toLowerCase();

                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFiltroColor(isSelected ? "TODOS" : color)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 capitalize ${
                      isSelected
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    <ColorSwatch colorName={color} className="h-2.5 w-2.5" />
                    <span>{color}</span>
                    <span className="opacity-75 font-mono text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Estado vacío si no hay variantes en el producto */}
      {producto.variantes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.02] p-8 sm:p-12 text-center space-y-3">
          <div className="text-4xl">👕</div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Sin variantes registradas
          </h4>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 max-w-md mx-auto">
            Este producto aún no cuenta con colores ni tallas. Agrega las primeras variantes para habilitar el control de stock y ventas.
          </p>
          <button
            type="button"
            className="btn-primary mt-2 px-5 py-2.5 text-xs font-bold cursor-pointer"
            onClick={() => {
              setEditingIndex(null);
              setEditingGroupKey(null);
              setMode("ADD");
            }}
          >
            ➕ Agregar la primera variante
          </button>
        </div>
      )}

      {/* Estado vacío por filtros */}
      {producto.variantes.length > 0 && variantesFiltradas.length === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
            No hay variantes que coincidan con &quot;{search || filtroColor}&quot;
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFiltroColor("TODOS");
            }}
            className="text-xs font-bold text-sky-600 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            Limpiar filtros de búsqueda
          </button>
        </div>
      )}

      {/* VISTA MÓVIL: Tarjetas de Variantes (md:hidden) */}
      {variantesFiltradas.length > 0 && (
        <div className="space-y-3 md:hidden">
          {variantesFiltradas.map((v, index) => {
            // Ubicar el índice original en producto.variantes para onDelete
            const originalIndex = producto.variantes.indexOf(v);

            return (
              <VarianteCard
                key={v.varianteId || `${v.color}-${v.colorSecundario || ""}-${v.talla}-${index}`}
                variante={v}
                precioBaseVenta={producto.precioVenta}
                precioBaseCosto={producto.precioCosto}
                onEdit={() => {
                  setEditingIndex(originalIndex >= 0 ? originalIndex : index);
                  setEditingGroupKey(getVariantGroupKey(v));
                  setMode("EDIT");
                }}
                onDelete={() => {
                  const targetIndex = originalIndex >= 0 ? originalIndex : index;
                  const nuevas = producto.variantes.filter((_, i) => i !== targetIndex);
                  saveVariantes(nuevas);
                }}
              />
            );
          })}
        </div>
      )}

      {/* VISTA ESCRITORIO: Tabla enriquecida (hidden md:block) */}
      {variantesFiltradas.length > 0 && (
        <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-gray-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-3 text-center">Foto</th>
                <th className="py-3 px-3">Color / Código</th>
                <th className="py-3 px-3 text-center">Talla</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-3 text-center">Precio / Medidas</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {variantesFiltradas.map((v, index) => {
                const originalIndex = producto.variantes.indexOf(v);

                return (
                  <VarianteRow
                    key={v.varianteId || `${v.color}-${v.colorSecundario || ""}-${v.talla}-${index}`}
                    variante={v}
                    precioBaseVenta={producto.precioVenta}
                    precioBaseCosto={producto.precioCosto}
                    onEdit={() => {
                      setEditingIndex(originalIndex >= 0 ? originalIndex : index);
                      setEditingGroupKey(getVariantGroupKey(v));
                      setMode("EDIT");
                    }}
                    onDelete={() => {
                      const targetIndex = originalIndex >= 0 ? originalIndex : index;
                      const nuevas = producto.variantes.filter((_, i) => i !== targetIndex);
                      saveVariantes(nuevas);
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Guía de Tallas */}
      <GuiaTallasModal
        producto={producto}
        isOpen={showGuiaTallas}
        onClose={() => setShowGuiaTallas(false)}
      />
    </div>
  );
}
