"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { MedidaTallaItem, Producto } from "@/types/producto";
import { updateProducto } from "@/services/producto.service";
import { TALLA_OPTIONS } from "@/constants/variant-options";
import {
  buildEffectiveMedidasPorTalla,
  compareTallasOrden,
  hasMedidasValues,
  sanitizeMedidasPorTalla,
} from "@/utils/medidas";

interface GuiaTallasModalProps {
  producto: Producto;
  allProductos?: Producto[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

type EditableRow = {
  talla: string;
  anchoPecho: string;
  anchoHombros: string;
  largoTotal: string;
  largoMangaAxila: string;
  largoMangaHombro: string;
};

const toStr = (val?: number) =>
  typeof val === "number" && val > 0 ? String(val) : "";

const toNum = (val: string) => {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function buildInitialRows(producto: Producto): EditableRow[] {
  const effective = buildEffectiveMedidasPorTalla(producto);
  const byKey = new Map<string, MedidaTallaItem>();

  for (const item of effective) {
    byKey.set(item.talla.trim().toLowerCase(), item);
  }

  // Asegurar que aparezcan todas las tallas actualmente usadas en variantes del producto
  for (const v of producto.variantes || []) {
    const t = v.talla?.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, { talla: t });
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => compareTallasOrden(a.talla, b.talla))
    .map((item) => ({
      talla: item.talla,
      anchoPecho: toStr(item.anchoPecho),
      anchoHombros: toStr(item.anchoHombros),
      largoTotal: toStr(item.largoTotal),
      largoMangaAxila: toStr(item.largoMangaAxila),
      largoMangaHombro: toStr(item.largoMangaHombro),
    }));
}

export default function GuiaTallasModal({
  producto,
  allProductos = [],
  isOpen,
  onClose,
  onUpdated,
}: GuiaTallasModalProps) {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [tallaNueva, setTallaNueva] = useState<string>("");
  const [tallaCustom, setTallaCustom] = useState<string>("");
  const [productoCopiarId, setProductoCopiarId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const canEdit = Boolean(onUpdated);

  useEffect(() => {
    if (!isOpen) return;
    setRows(buildInitialRows(producto));
    setTallaNueva("");
    setTallaCustom("");
    setProductoCopiarId("");
  }, [isOpen, producto]);

  // Otros productos que ya tengan medidas configuradas para copiar rápido
  const productosConMedidas = useMemo(() => {
    return allProductos
      .filter((p) => p._id !== producto._id)
      .map((p) => ({
        producto: p,
        medidas: buildEffectiveMedidasPorTalla(p),
      }))
      .filter((entry) => entry.medidas.length > 0);
  }, [allProductos, producto._id]);

  // Tallas existentes en variantes del producto (para mostrar un chip informativo)
  const tallasEnVariantes = useMemo(() => {
    return new Set(
      (producto.variantes || [])
        .map((v) => v.talla?.trim().toLowerCase())
        .filter(Boolean)
    );
  }, [producto.variantes]);

  if (!isOpen) return null;

  const updateCell = (
    index: number,
    field: keyof Omit<EditableRow, "talla">,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleAddTalla = () => {
    const tallaFinal = (
      tallaNueva === "__CUSTOM__" ? tallaCustom : tallaNueva
    ).trim();
    if (!tallaFinal) {
      toast.error("Selecciona o escribe una talla para agregar");
      return;
    }

    if (
      rows.some(
        (r) => r.talla.trim().toLowerCase() === tallaFinal.toLowerCase()
      )
    ) {
      toast.error(`La talla ${tallaFinal} ya está en la tabla`);
      return;
    }

    setRows((prev) =>
      [
        ...prev,
        {
          talla: tallaFinal,
          anchoPecho: "",
          anchoHombros: "",
          largoTotal: "",
          largoMangaAxila: "",
          largoMangaHombro: "",
        },
      ].sort((a, b) => compareTallasOrden(a.talla, b.talla))
    );
    setTallaNueva("");
    setTallaCustom("");
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopiarDeProducto = (sourceId: string) => {
    setProductoCopiarId(sourceId);
    if (!sourceId) return;
    const found = productosConMedidas.find((p) => p.producto._id === sourceId);
    if (!found) return;

    const merged = new Map<string, EditableRow>();
    for (const r of rows) {
      merged.set(r.talla.trim().toLowerCase(), r);
    }

    for (const m of found.medidas) {
      const key = m.talla.trim().toLowerCase();
      merged.set(key, {
        talla: m.talla,
        anchoPecho: toStr(m.anchoPecho),
        anchoHombros: toStr(m.anchoHombros),
        largoTotal: toStr(m.largoTotal),
        largoMangaAxila: toStr(m.largoMangaAxila),
        largoMangaHombro: toStr(m.largoMangaHombro),
      });
    }

    setRows(
      Array.from(merged.values()).sort((a, b) =>
        compareTallasOrden(a.talla, b.talla)
      )
    );
    toast.success(
      `Medidas copiadas de "${found.producto.nombre}" (revisa y presiona Guardar)`
    );
  };

  const handleSave = async () => {
    if (!onUpdated) return;

    const payloadMedidas = sanitizeMedidasPorTalla(
      rows.map((r) => ({
        talla: r.talla,
        anchoPecho: toNum(r.anchoPecho),
        anchoHombros: toNum(r.anchoHombros),
        largoTotal: toNum(r.largoTotal),
        largoMangaAxila: toNum(r.largoMangaAxila),
        largoMangaHombro: toNum(r.largoMangaHombro),
      }))
    );

    setSaving(true);
    try {
      await updateProducto(producto._id, {
        medidasPorTalla: payloadMedidas,
      });
      await onUpdated();
      toast.success(
        payloadMedidas.length > 0
          ? `Guía de tallas guardada (${payloadMedidas.length} ${
              payloadMedidas.length === 1 ? "talla" : "tallas"
            }) — aplica a todos los colores`
          : "Guía de tallas limpiada correctamente"
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la guía de tallas"
      );
    } finally {
      setSaving(false);
    }
  };

  const tallasCompletadasCount = rows.filter((r) =>
    hasMedidasValues({
      anchoPecho: toNum(r.anchoPecho),
      anchoHombros: toNum(r.anchoHombros),
      largoTotal: toNum(r.largoTotal),
      largoMangaAxila: toNum(r.largoMangaAxila),
      largoMangaHombro: toNum(r.largoMangaHombro),
    })
  ).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="absolute inset-0"
        onClick={!saving ? onClose : undefined}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/90 p-4 sm:p-5 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📏</span>
              <span>Guía de Tallas y Medidas del Producto</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
              <strong>{producto.nombre}</strong> ({producto.modelo}) — En centímetros (cm).{" "}
              <span className="text-sky-700 dark:text-cyan-400 font-medium">
                Cada talla se llena 1 sola vez y aplica automáticamente a todos sus colores.
              </span>
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* BARRA DE HERRAMIENTAS: AGREGAR TALLA / COPIAR DE OTRO PRODUCTO */}
          {canEdit && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={tallaNueva}
                  onChange={(e) => setTallaNueva(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">+ Agregar talla...</option>
                  {TALLA_OPTIONS.map((t) => (
                    <option
                      key={t}
                      value={t}
                      disabled={rows.some(
                        (r) => r.talla.toLowerCase() === t.toLowerCase()
                      )}
                    >
                      Talla {t}
                    </option>
                  ))}
                  <option value="__CUSTOM__">Otra talla...</option>
                </select>

                {tallaNueva === "__CUSTOM__" && (
                  <input
                    type="text"
                    value={tallaCustom}
                    onChange={(e) => setTallaCustom(e.target.value)}
                    placeholder="Ej: 3XL, Única"
                    maxLength={20}
                    className="w-28 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                )}

                <button
                  type="button"
                  onClick={handleAddTalla}
                  disabled={!tallaNueva}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  Añadir fila
                </button>
              </div>

              {productosConMedidas.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-gray-400 shrink-0">
                    📋 Copiar de:
                  </span>
                  <select
                    value={productoCopiarId}
                    onChange={(e) => handleCopiarDeProducto(e.target.value)}
                    className="max-w-[230px] rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Otro producto...</option>
                    {productosConMedidas.map(({ producto: p, medidas }) => (
                      <option key={p._id} value={p._id}>
                        {p.nombre} ({p.modelo}) · {medidas.length} tallas
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TABLA DE MEDIDAS */}
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-8 text-center text-sm text-slate-500 dark:text-gray-400">
              {canEdit
                ? "Aún no hay tallas en la guía. Agrega una talla arriba (S, M, L, XL, 4, 6...) para empezar."
                : "Este producto aún no cuenta con medidas registradas."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-[11px] font-bold uppercase text-slate-500 dark:text-gray-400">
                  <tr>
                    <th className="py-2.5 px-3">Talla</th>
                    <th className="py-2.5 px-2.5">Pecho (axila-axila)</th>
                    <th className="py-2.5 px-2.5">Hombros</th>
                    <th className="py-2.5 px-2.5">Largo total</th>
                    <th className="py-2.5 px-2.5">Manga (axila)</th>
                    <th className="py-2.5 px-2.5">Manga (hombro)</th>
                    {canEdit && <th className="py-2.5 px-2 text-center">Quitar</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {rows.map((row, index) => {
                    const enVariantes = tallasEnVariantes.has(
                      row.talla.trim().toLowerCase()
                    );
                    return (
                      <tr
                        key={row.talla}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-lg bg-sky-100 dark:bg-cyan-950/60 text-sky-800 dark:text-cyan-300 border border-sky-200 dark:border-cyan-500/30 px-2 py-0.5 font-mono font-bold text-xs">
                              {row.talla}
                            </span>
                            {enVariantes && (
                              <span
                                className="text-[10px] text-emerald-600 dark:text-emerald-400"
                                title="Talla activa en variantes del producto"
                              >
                                ●
                              </span>
                            )}
                          </div>
                        </td>

                        {(
                          [
                            ["anchoPecho", "Ej: 52"],
                            ["anchoHombros", "Ej: 44"],
                            ["largoTotal", "Ej: 68"],
                            ["largoMangaAxila", "Ej: 50"],
                            ["largoMangaHombro", "Ej: 62"],
                          ] as const
                        ).map(([field, placeholder]) => (
                          <td key={field} className="py-2 px-2">
                            {canEdit ? (
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  placeholder={placeholder}
                                  value={row[field]}
                                  onChange={(e) =>
                                    updateCell(index, field, e.target.value)
                                  }
                                  className="w-24 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 pl-2.5 pr-7 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                                  cm
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-slate-700 dark:text-gray-200">
                                {row[field] ? `${row[field]} cm` : "—"}
                              </span>
                            )}
                          </td>
                        ))}

                        {canEdit && (
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(index)}
                              className="h-7 w-7 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition cursor-pointer"
                              title="Quitar fila de talla"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {canEdit && (
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">●</span>{" "}
              indica tallas que actualmente existen en las variantes de este producto. Solo se guardan las filas que tengan al menos una medida mayor a 0.
            </p>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900 p-4 shrink-0">
          <span className="text-xs text-slate-500 dark:text-gray-400">
            {tallasCompletadasCount}{" "}
            {tallasCompletadasCount === 1
              ? "talla con medidas completas/parciales"
              : "tallas con medidas"}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 text-xs font-semibold transition cursor-pointer"
            >
              {canEdit ? "Cancelar" : "Entendido"}
            </button>

            {canEdit && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Guardar Guía de Tallas</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
