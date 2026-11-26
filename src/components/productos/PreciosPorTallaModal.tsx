"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Producto, Variante } from "@/types/producto";
import { updateProducto } from "@/services/producto.service";
import { compareTallasOrden, extractMedidasPrenda } from "@/utils/medidas";
import { formatMoney, getVariantPricing } from "@/utils/pricing";

interface PreciosPorTallaModalProps {
  producto: Producto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}

type TallaPriceRow = {
  tallaKey: string;
  tallaLabel: string;
  count: number;
  colores: string[];
  precioInput: string;
  touched: boolean;
  clearToBase: boolean;
  isMixed: boolean;
  currentMin: number;
  currentMax: number;
  hasCustomPrices: boolean;
  maxCosto: number;
};

function buildTallaRows(producto: Producto): TallaPriceRow[] {
  const baseVenta = Number(producto.precioVenta || 0);
  const groups = new Map<string, { label: string; variantes: Variante[] }>();

  for (const v of producto.variantes || []) {
    const label = (v.talla || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.variantes.push(v);
    } else {
      groups.set(key, { label, variantes: [v] });
    }
  }

  return Array.from(groups.entries())
    .sort(([, a], [, b]) => compareTallasOrden(a.label, b.label))
    .map(([tallaKey, { label, variantes }]) => {
      const effectivePrices = variantes.map((v) =>
        getVariantPricing(producto, v).precioVenta
      );
      const customPrices = variantes.map((v) =>
        v.precioVenta !== undefined && v.precioVenta !== null && Number(v.precioVenta) > 0
          ? Number(v.precioVenta)
          : null
      );

      const distinctEffective = new Set(effectivePrices.map((p) => Number(p.toFixed(2))));
      const hasCustomPrices = customPrices.some((p) => p !== null);
      const allSameCustom =
        customPrices.every((p) => p !== null) &&
        new Set(customPrices.map((p) => Number((p as number).toFixed(2)))).size === 1;
      const isMixed = distinctEffective.size > 1 || (hasCustomPrices && !allSameCustom && customPrices.some((p) => p === null));

      const currentMin = effectivePrices.length > 0 ? Math.min(...effectivePrices) : baseVenta;
      const currentMax = effectivePrices.length > 0 ? Math.max(...effectivePrices) : baseVenta;
      const maxCosto = variantes.reduce((max, v) => {
        const c = getVariantPricing(producto, v).precioCosto;
        return c > max ? c : max;
      }, 0);

      const colores = Array.from(
        new Set(
          variantes.map((v) =>
            v.colorSecundario ? `${v.color} / ${v.colorSecundario}` : v.color
          )
        )
      );

      return {
        tallaKey,
        tallaLabel: label,
        count: variantes.length,
        colores,
        precioInput: allSameCustom ? String(customPrices[0]) : "",
        touched: false,
        clearToBase: false,
        isMixed,
        currentMin,
        currentMax,
        hasCustomPrices,
        maxCosto,
      };
    });
}

function buildSanitizedVariantePayload(
  v: Variante,
  nextPrecioVenta: number | undefined
): Variante {
  const payload: Variante = {
    color: v.color,
    talla: v.talla,
    stock: Number(v.stock || 0),
    imagenes: Array.isArray(v.imagenes) ? v.imagenes : [],
  };

  if (v.varianteId) payload.varianteId = v.varianteId;
  if (v.colorSecundario) payload.colorSecundario = v.colorSecundario;
  if (v.stockReservado !== undefined) payload.stockReservado = Number(v.stockReservado);
  if (v.imagen) payload.imagen = v.imagen;
  if (v.descripcion) payload.descripcion = v.descripcion;
  if (v.codigoBarra) payload.codigoBarra = v.codigoBarra;
  if (v.qrCode) payload.qrCode = v.qrCode;
  if (nextPrecioVenta !== undefined) payload.precioVenta = nextPrecioVenta;
  if (v.precioCosto !== undefined && v.precioCosto !== null) {
    payload.precioCosto = Number(v.precioCosto);
  }
  if (v.precioOfertaWeb !== undefined) {
    payload.precioOfertaWeb = v.precioOfertaWeb;
  }

  const cleanMedidas = extractMedidasPrenda(v.medidas);
  if (cleanMedidas) {
    payload.medidas = cleanMedidas;
  }

  return payload;
}

export default function PreciosPorTallaModal({
  producto,
  isOpen,
  onClose,
  onUpdated,
}: PreciosPorTallaModalProps) {
  const [rows, setRows] = useState<TallaPriceRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !producto) return;
    setRows(buildTallaRows(producto));
  }, [isOpen, producto]);

  const modifiedRowsCount = useMemo(
    () => rows.filter((r) => r.touched).length,
    [rows]
  );

  const affectedVariantsCount = useMemo(
    () => rows.filter((r) => r.touched).reduce((sum, r) => sum + r.count, 0),
    [rows]
  );

  if (!isOpen || !producto) return null;

  const basePrecioVenta = Number(producto.precioVenta || 0);

  const handlePriceChange = (tallaKey: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.tallaKey !== tallaKey) return row;
        const trimmed = value.trim();
        return {
          ...row,
          precioInput: value,
          touched: true,
          clearToBase: trimmed === "",
        };
      })
    );
  };

  const handleResetRowToBase = (tallaKey: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.tallaKey === tallaKey
          ? {
              ...row,
              precioInput: "",
              touched: true,
              clearToBase: true,
            }
          : row
      )
    );
  };

  const handleResetAllToBase = () => {
    setRows((prev) =>
      prev.map((row) =>
        row.hasCustomPrices || row.precioInput !== ""
          ? {
              ...row,
              precioInput: "",
              touched: true,
              clearToBase: true,
            }
          : row
      )
    );
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      onClose();
      return;
    }

    const decisions = new Map<string, { apply: boolean; price?: number }>();

    for (const row of rows) {
      if (!row.touched) {
        decisions.set(row.tallaKey, { apply: false });
        continue;
      }

      const trimmed = row.precioInput.trim();
      if (row.clearToBase || trimmed === "") {
        decisions.set(row.tallaKey, { apply: true, price: undefined });
        continue;
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error(
          `En la talla ${row.tallaLabel}, ingresa un precio válido mayor a 0 o usa "Usar base"`
        );
        return;
      }

      decisions.set(row.tallaKey, {
        apply: true,
        price: Number(parsed.toFixed(2)),
      });
    }

    const hasChanges = Array.from(decisions.values()).some((d) => d.apply);
    if (!hasChanges) {
      toast.info("No realizaste cambios en los precios por talla");
      onClose();
      return;
    }

    const updatedVariantes = (producto.variantes || []).map((v) => {
      const key = (v.talla || "").trim().toLowerCase();
      const decision = decisions.get(key);

      const currentCustomPrice =
        v.precioVenta !== undefined && v.precioVenta !== null && Number(v.precioVenta) > 0
          ? Number(v.precioVenta)
          : undefined;

      const nextPrecioVenta =
        decision && decision.apply ? decision.price : currentCustomPrice;

      return buildSanitizedVariantePayload(v, nextPrecioVenta);
    });

    setSaving(true);
    try {
      await updateProducto(producto._id, { variantes: updatedVariantes });
      await onUpdated();
      toast.success(
        `Precios actualizados en ${affectedVariantsCount} ${
          affectedVariantsCount === 1 ? "variante" : "variantes"
        }`
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar los precios por talla"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="absolute inset-0"
        onClick={!saving ? onClose : undefined}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/90 p-4 sm:p-5 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>💲</span>
              <span>Precios por talla</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              {producto.nombre}
              {producto.modelo ? ` · ${producto.modelo}` : ""} · Precio base:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatMoney(basePrecioVenta)}
              </strong>
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-sky-200 dark:border-cyan-500/25 bg-sky-50/70 dark:bg-cyan-950/20 px-3.5 py-2.5 text-xs text-sky-900 dark:text-cyan-200">
            <span>
              Asigna un precio a cada talla y se aplicará automáticamente a{" "}
              <strong>todos los colores</strong> de esa talla.
            </span>
            {rows.some((r) => r.hasCustomPrices) && (
              <button
                type="button"
                disabled={saving}
                onClick={handleResetAllToBase}
                className="shrink-0 self-start sm:self-auto rounded-lg border border-sky-300 dark:border-cyan-500/40 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-cyan-300 hover:bg-sky-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Usar base en todas
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-8 text-center text-sm text-slate-500 dark:text-gray-400">
              Este producto aún no tiene variantes registradas.
            </div>
          ) : (
            <div className="space-y-2.5">
              {rows.map((row) => {
                const parsedInput = Number(row.precioInput);
                const hasValidTypedPrice =
                  row.precioInput.trim() !== "" &&
                  Number.isFinite(parsedInput) &&
                  parsedInput > 0;
                const belowCostWarning =
                  hasValidTypedPrice &&
                  row.maxCosto > 0 &&
                  parsedInput < row.maxCosto;

                return (
                  <div
                    key={row.tallaKey}
                    className={`rounded-xl border p-3 transition ${
                      row.touched
                        ? "border-sky-300 dark:border-cyan-500/40 bg-sky-50/40 dark:bg-cyan-950/15"
                        : "border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-sky-100 dark:bg-cyan-950/60 text-sky-800 dark:text-cyan-300 border border-sky-200 dark:border-cyan-500/30 px-2.5 py-0.5 text-xs font-bold font-mono">
                            Talla {row.tallaLabel}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {row.count} {row.count === 1 ? "variante" : "variantes"}
                          </span>

                          {row.touched ? (
                            <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-cyan-300">
                              {row.clearToBase ? "Cambiará a base" : "Modificado"}
                            </span>
                          ) : row.isMixed ? (
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              Mixto ({formatMoney(row.currentMin)} – {formatMoney(row.currentMax)})
                            </span>
                          ) : row.hasCustomPrices ? (
                            <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300">
                              Personalizado
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-200/70 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-gray-400">
                              Usa precio base
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate capitalize">
                          Colores: {row.colores.join(", ")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative w-36 sm:w-40">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            Bs
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            disabled={saving}
                            value={row.precioInput}
                            onChange={(e) =>
                              handlePriceChange(row.tallaKey, e.target.value)
                            }
                            placeholder={
                              row.isMixed && !row.touched
                                ? "Sin cambio"
                                : basePrecioVenta.toFixed(2)
                            }
                            className="input w-full pl-8 pr-2.5 py-1.5 text-sm font-bold"
                            aria-label={`Precio para talla ${row.tallaLabel}`}
                          />
                        </div>

                        {(row.hasCustomPrices ||
                          row.precioInput !== "" ||
                          (row.isMixed && !row.clearToBase)) && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleResetRowToBase(row.tallaKey)}
                            title={`Restablecer talla ${row.tallaLabel} al precio base (Bs ${basePrecioVenta.toFixed(2)})`}
                            className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            Usar base
                          </button>
                        )}
                      </div>
                    </div>

                    {belowCostWarning && (
                      <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        ⚠️ Atención: este precio es menor al costo de alguna variante (máx.{" "}
                        {formatMoney(row.maxCosto)}).
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/90 p-4 sm:p-5 shrink-0">
          <p className="text-xs text-slate-500 dark:text-gray-400">
            {modifiedRowsCount > 0 ? (
              <>
                Se actualizarán{" "}
                <strong className="text-slate-900 dark:text-white">
                  {affectedVariantsCount}{" "}
                  {affectedVariantsCount === 1 ? "variante" : "variantes"}
                </strong>{" "}
                en {modifiedRowsCount}{" "}
                {modifiedRowsCount === 1 ? "talla" : "tallas"}.
              </>
            ) : (
              "Edita una o más tallas para actualizar sus variantes."
            )}
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="btn-secondary flex-1 sm:flex-initial"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || rows.length === 0}
              onClick={() => void handleSave()}
              className="btn-primary flex-1 sm:flex-initial"
            >
              {saving ? "Guardando..." : "Guardar precios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
