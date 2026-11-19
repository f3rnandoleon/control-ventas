"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Producto, RebajaWeb } from "@/types/producto";
import { createProductoSchema } from "@/schemas/producto.schema";
import { getAjustesAdmin } from "@/services/ajustes.service";
import { getWebVariantPricing } from "@/utils/pricing";

function toDateTimeLocalValue(date?: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ProductoFormValues = z.input<typeof createProductoSchema>;
type ProductoFormSubmitValues = z.output<typeof createProductoSchema>;

export default function ProductoForm({
  initialData,
  onSubmit,
}: {
  initialData?: Partial<Producto>;
  onSubmit: (data: Partial<Producto>) => void;
}) {
  // Modalidad de moneda de costo: "PEN" (Soles) o "BOB" (Bolivianos)
  const initialMoneda: "PEN" | "BOB" =
    initialData?.costoOrigen?.moneda === "BOB" ? "BOB" : "PEN";
  const [monedaCosto, setMonedaCosto] = useState<"PEN" | "BOB">(initialMoneda);

  // Tipo de cambio oficial y tipo de cambio editable para este producto
  const [oficialTC, setOficialTC] = useState<number>(2.1);
  const [tipoCambio, setTipoCambio] = useState<number>(
    initialData?.costoOrigen?.tipoCambioAplicado || 2.1
  );

  // Monto en Soles (si aplica)
  const [costoPEN, setCostoPEN] = useState<number>(() => {
    if (initialData?.costoOrigen?.moneda === "PEN") {
      return initialData.costoOrigen.montoOriginal;
    }
    if (initialData?.precioCosto && initialData.precioCosto > 0) {
      return Math.round((initialData.precioCosto / 2.1) * 100) / 100;
    }
    return 0;
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductoFormValues, unknown, ProductoFormSubmitValues>({
    resolver: zodResolver(createProductoSchema),
    defaultValues: {
      nombre: initialData?.nombre || "",
      modelo: initialData?.modelo || "",
      precioVenta: initialData?.precioVenta || 0,
      precioCosto: initialData?.precioCosto || 0,
      categoria: initialData?.categoria || "Chompas",
    },
  });

  const precioVentaWatched = watch("precioVenta") || 0;
  const precioCostoWatched = watch("precioCosto") || 0;

  // Cargar el tipo de cambio oficial de Ajustes
  useEffect(() => {
    async function fetchTC() {
      try {
        const ajustes = await getAjustesAdmin();
        if (ajustes?.finanzas?.tipoCambioPEN_BOB) {
          const tc = ajustes.finanzas.tipoCambioPEN_BOB;
          setOficialTC(tc);
          if (!initialData?.costoOrigen?.tipoCambioAplicado) {
            setTipoCambio(tc);
          }
        }
      } catch (err) {
        console.warn("No se pudo obtener el TC de ajustes, usando default 2.10", err);
      }
    }
    fetchTC();
  }, [initialData]);

  // Si está en modalidad PEN, sincronizar el precioCosto en BOB al cambiar costoPEN o tipoCambio
  useEffect(() => {
    if (monedaCosto === "PEN") {
      const bob = Math.round(costoPEN * tipoCambio * 100) / 100;
      setValue("precioCosto", bob, { shouldValidate: true });
    }
  }, [costoPEN, tipoCambio, monedaCosto, setValue]);

  const [rebajaActiva, setRebajaActiva] = useState<boolean>(
    Boolean(initialData?.rebajaWeb?.activa)
  );
  const [rebajaTipo, setRebajaTipo] = useState<"PORCENTAJE" | "PRECIO_FIJO">(
    initialData?.rebajaWeb?.tipo === "PRECIO_FIJO" ? "PRECIO_FIJO" : "PORCENTAJE"
  );
  const [rebajaValor, setRebajaValor] = useState<number>(
    Number(initialData?.rebajaWeb?.valor || 0)
  );
  const [rebajaFechaInicio, setRebajaFechaInicio] = useState<string>(
    toDateTimeLocalValue(initialData?.rebajaWeb?.fechaInicio)
  );
  const [rebajaFechaFin, setRebajaFechaFin] = useState<string>(
    toDateTimeLocalValue(initialData?.rebajaWeb?.fechaFin)
  );

  const [categoriaSelect, setCategoriaSelect] = useState(() => {
    const isKnown = ["Chompas", "Poleras", "Ponchos"].includes(
      initialData?.categoria || "Chompas"
    );
    return isKnown ? initialData?.categoria || "Chompas" : "Otra";
  });

  const gananciaEstimada = precioVentaWatched - precioCostoWatched;
  const margenPorcentaje =
    precioVentaWatched > 0
      ? Math.round((gananciaEstimada / precioVentaWatched) * 100)
      : 0;

  const rebajaPreviewDraft: RebajaWeb = {
    activa: rebajaActiva,
    tipo: rebajaTipo,
    valor: rebajaValor,
    fechaInicio: rebajaFechaInicio ? new Date(rebajaFechaInicio).toISOString() : null,
    fechaFin: rebajaFechaFin ? new Date(rebajaFechaFin).toISOString() : null,
  };
  const webPricingPreview = getWebVariantPricing(
    {
      precioVenta: precioVentaWatched,
      precioCosto: precioCostoWatched,
      rebajaWeb: rebajaActiva
        ? { ...rebajaPreviewDraft, fechaInicio: null, fechaFin: null }
        : null,
    },
    null
  );

  return (
    <form
      onSubmit={handleSubmit((data) => {
        // Adjuntar el snapshot inmutable de costo de origen si se ingresó costo > 0
        const costoOrigenSnapshot =
          monedaCosto === "PEN" && costoPEN > 0
            ? {
                moneda: "PEN" as const,
                montoOriginal: costoPEN,
                tipoCambioAplicado: tipoCambio,
                fechaRegistro: new Date(),
              }
            : (data.precioCosto && data.precioCosto > 0)
            ? {
                moneda: "BOB" as const,
                montoOriginal: data.precioCosto,
                tipoCambioAplicado: 1,
                fechaRegistro: new Date(),
              }
            : undefined;

        const payload: Partial<Producto> = {
          ...data,
          precioCosto: data.precioCosto || 0,
          costoOrigen: costoOrigenSnapshot,
          rebajaWeb: {
            activa: rebajaActiva,
            tipo: rebajaTipo,
            valor: rebajaActiva ? Math.max(0, Number(rebajaValor || 0)) : 0,
            fechaInicio:
              rebajaActiva && rebajaFechaInicio
                ? new Date(rebajaFechaInicio).toISOString()
                : null,
            fechaFin:
              rebajaActiva && rebajaFechaFin
                ? new Date(rebajaFechaFin).toISOString()
                : null,
          },
        };

        if (initialData?._id) {
          delete payload.variantes;
        }

        onSubmit(payload);
      })}
      className="space-y-5"
    >
      <div>
        <label className="label">Nombre del producto</label>
        <input
          {...register("nombre")}
          className="input w-full"
          placeholder="Chompa Invierno"
        />
        {errors.nombre && (
          <p className="mt-1 text-xs text-red-400">{errors.nombre.message}</p>
        )}
      </div>

      <div>
        <label className="label">Modelo</label>
        <input
          {...register("modelo")}
          className="input w-full"
          placeholder="INV-2025"
        />
        {errors.modelo && (
          <p className="mt-1 text-xs text-red-400">{errors.modelo.message}</p>
        )}
      </div>

      <div>
        <label className="label">Categoría</label>
        <select
          className="input w-full mb-2"
          value={categoriaSelect}
          onChange={(e) => {
            setCategoriaSelect(e.target.value);
            if (e.target.value !== "Otra") {
              setValue("categoria", e.target.value, { shouldValidate: true });
            } else {
              setValue("categoria", "", { shouldValidate: true });
            }
          }}
        >
          <option value="Chompas">Chompas</option>
          <option value="Poleras">Poleras</option>
          <option value="Ponchos">Ponchos</option>
          <option value="Ruanas">Ruanas</option>
          <option value="Otra">Otra...</option>
        </select>

        <input
          {...register("categoria")}
          className={`input w-full ${categoriaSelect !== "Otra" ? "hidden" : ""}`}
          placeholder="Escribe la nueva categoría"
        />

        {errors.categoria && (
          <p className="mt-1 text-xs text-red-400">
            {errors.categoria?.message as string}
          </p>
        )}
      </div>

      {/* SECCIÓN FINANCIERA: COSTO & PRECIO DE VENTA */}
      {initialData?._id ? (
        // MODO EDICIÓN: COSTO BLOQUEADO (AUDITADO POR KARDEX / CPP)
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔒</span>
              <label className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                Costo Promedio Ponderado Oficial (CPP)
              </label>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
              Auditado por Kardex
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-sky-100 shadow-xs">
            <div>
              <span className="text-[11px] text-slate-500 block">Costo unitario actual en sistema</span>
              <span className="text-xl font-black text-sky-900">
                Bs {precioCostoWatched.toFixed(2)}
              </span>
            </div>
            <a
              href="/dashboard/admin/inventario/compras/nueva"
              className="text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition text-center"
            >
              📦 Registrar nueva compra
            </a>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Este costo se calcula y actualiza de manera automática mediante las órdenes de compra. No es editable manualmente para evitar descuadres contables en la tarjeta valorada.
          </p>
        </div>
      ) : (
        // MODO CREACIÓN: COSTO DE REFERENCIA ESTIMADO PARA CALCULAR MARGEN COMERCIAL
        <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-sky-900 uppercase tracking-wider block">
                  Costo de Referencia Inicial
                </label>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  Opcional (Bs. 0)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Puedes dejarlo en 0. El costo oficial (CPP) se fijará automáticamente con tu primera orden de compra.
              </span>
            </div>
            {/* Toggle de Moneda de Compra */}
            <div className="inline-flex rounded-lg bg-white p-0.5 border border-sky-200 text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMonedaCosto("PEN")}
                className={`px-3 py-1 rounded-md transition ${
                  monedaCosto === "PEN"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-sky-700"
                }`}
              >
                🇵🇪 Soles (PEN)
              </button>
              <button
                type="button"
                onClick={() => setMonedaCosto("BOB")}
                className={`px-3 py-1 rounded-md transition ${
                  monedaCosto === "BOB"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-sky-700"
                }`}
              >
                🇧🇴 Bolivianos (Bs)
              </button>
            </div>
          </div>

          {monedaCosto === "PEN" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Costo en Soles (S/.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costoPEN || ""}
                  onChange={(e) => setCostoPEN(parseFloat(e.target.value) || 0)}
                  className="input w-full mt-1 bg-white"
                  placeholder="Ej: 35.00"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">
                    Tipo de cambio (Bs/S/.)
                  </label>
                  {tipoCambio !== oficialTC && (
                    <button
                      type="button"
                      onClick={() => setTipoCambio(oficialTC)}
                      className="text-[10px] text-sky-600 underline font-semibold"
                    >
                      Usar oficial ({oficialTC})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tipoCambio || ""}
                  onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 0)}
                  className="input w-full mt-1 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Costo Resultante (Bs)
                </label>
                <div className="mt-1 flex h-10 items-center justify-between rounded-xl bg-white px-3 font-bold text-sky-800 border border-slate-200">
                  <span>Bs {precioCostoWatched.toFixed(2)}</span>
                  <span className="text-[11px] font-normal text-slate-400">Referencial</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Precio costo referencial (Bs) - Opcional</label>
              <input
                {...register("precioCosto", { valueAsNumber: true })}
                type="number"
                className="input w-full bg-white"
                step="0.01"
                min="0"
                placeholder="0.00 (Opcional, se fijará en Compras)"
              />
            </div>
          )}

          {errors.precioCosto && (
            <p className="text-xs text-red-500">{errors.precioCosto.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Precio venta (Bs)</label>
          <input
            {...register("precioVenta", { valueAsNumber: true })}
            type="number"
            className="input w-full font-bold text-slate-900"
            step="0.01"
          />
          {errors.precioVenta && (
            <p className="mt-1 text-xs text-red-400">
              {errors.precioVenta.message}
            </p>
          )}
        </div>

        <div>
          <label className="label">SKU</label>
          <input
            className="input w-full cursor-not-allowed text-gray-400"
            value={initialData?.sku || "Generado automáticamente"}
            disabled
          />
        </div>
      </div>

      {/* Indicador de Margen y Ganancia Proyectada */}
      {precioVentaWatched > 0 && precioCostoWatched > 0 && (
        <div
          className={`rounded-xl p-3 text-xs flex items-center justify-between border ${
            gananciaEstimada > 0
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
              : "bg-red-50/80 border-red-200 text-red-900"
          }`}
        >
          <span>
            {gananciaEstimada > 0 ? "📈 Margen Proyectado:" : "⚠️ Alerta de Margen:"}{" "}
            <strong>{margenPorcentaje}%</strong>
          </span>
          <span>
            Ganancia por prenda:{" "}
            <strong>Bs {gananciaEstimada.toFixed(2)}</strong>
          </span>
        </div>
      )}

      {/* Sección: Rebaja de Catálogo Exclusiva Web ("Antes / Ahora") */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-3 dark:border-amber-500/30 dark:bg-amber-950/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Rebaja Web (&quot;Antes / Ahora&quot;)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Solo aplica en la tienda online. El precio del POS físico no cambia.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rebajaActiva}
              onChange={(e) => setRebajaActiva(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {rebajaActiva ? "Activa" : "Inactiva"}
            </span>
          </label>
        </div>

        {rebajaActiva && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Tipo de rebaja</label>
                <select
                  value={rebajaTipo}
                  onChange={(e) =>
                    setRebajaTipo(e.target.value as "PORCENTAJE" | "PRECIO_FIJO")
                  }
                  className="input w-full text-sm"
                >
                  <option value="PORCENTAJE">Porcentaje (% OFF)</option>
                  <option value="PRECIO_FIJO">Precio oferta fijo (Bs)</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">
                  {rebajaTipo === "PORCENTAJE" ? "Descuento (%)" : "Precio Ahora (Bs)"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={rebajaTipo === "PORCENTAJE" ? 95 : undefined}
                  step="0.01"
                  value={rebajaValor || ""}
                  onChange={(e) => setRebajaValor(Number(e.target.value) || 0)}
                  placeholder={rebajaTipo === "PORCENTAJE" ? "Ej: 20" : "Ej: 150.00"}
                  className="input w-full text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Desde (Opcional)</label>
                <input
                  type="datetime-local"
                  value={rebajaFechaInicio}
                  onChange={(e) => setRebajaFechaInicio(e.target.value)}
                  className="input w-full text-xs"
                />
              </div>
              <div>
                <label className="label text-xs">Hasta (Opcional)</label>
                <input
                  type="datetime-local"
                  value={rebajaFechaFin}
                  onChange={(e) => setRebajaFechaFin(e.target.value)}
                  className="input w-full text-xs"
                />
              </div>
            </div>

            {precioVentaWatched > 0 && (
              <div className="rounded-lg bg-white/80 dark:bg-slate-900/60 border border-amber-200/70 dark:border-white/10 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  POS: <strong>Bs {precioVentaWatched.toFixed(2)}</strong>
                </span>
                <span className="text-slate-700 dark:text-slate-200">
                  Web:{" "}
                  {webPricingPreview.tieneRebaja ? (
                    <>
                      <span className="line-through text-slate-400 mr-1.5">
                        Bs {webPricingPreview.precioLista.toFixed(2)}
                      </span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        Bs {webPricingPreview.precioVenta.toFixed(2)} (-{webPricingPreview.porcentajeDescuento}%)
                      </strong>
                    </>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Ingrese un valor válido menor al precio lista
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <button type="submit" className="btn-primary w-full justify-center">
        {initialData?._id ? "Actualizar producto" : "Guardar producto"}
      </button>
    </form>
  );
}
