"use client";

import { useState, useEffect } from "react";
import type { ProductoInventario } from "@/types/inventario";
import type { Variante } from "@/types/producto";
import type { Sucursal } from "@/types/sucursal";
import { getSucursales } from "@/services/sucursales.service";
import { ajustarStockInventario } from "@/services/inventario.service";
import { formatMoney } from "@/utils/pricing";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";

interface AjusteStockModalProps {
  isOpen: boolean;
  producto: ProductoInventario | null;
  variante: Variante | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AjusteStockModal({
  isOpen,
  producto,
  variante,
  onClose,
  onSuccess,
}: AjusteStockModalProps) {
  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA">("ENTRADA");
  const [cantidad, setCantidad] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>("Conteo físico (sobrante)");
  const [referencia, setReferencia] = useState<string>("AJUSTE_MANUAL");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalSeleccionadaId, setSucursalSeleccionadaId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cargar sucursales
  useEffect(() => {
    if (!isOpen) return;
    getSucursales()
      .then((data) => {
        const activas = data.filter((s) => s.activa);
        setSucursales(activas);
        if (activas.length > 0) {
          setSucursalSeleccionadaId(activas[0]._id);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Restablecer estados al abrir
  useEffect(() => {
    if (isOpen) {
      setTipo("ENTRADA");
      setCantidad(1);
      setMotivo("Conteo físico (sobrante)");
      setReferencia("AJUSTE_MANUAL");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, variante]);

  // Actualizar motivo predeterminado al cambiar tipo
  const handleCambiarTipo = (nuevoTipo: "ENTRADA" | "SALIDA") => {
    setTipo(nuevoTipo);
    setErrorMsg(null);
    if (nuevoTipo === "ENTRADA") {
      setMotivo("Conteo físico (sobrante)");
    } else {
      setMotivo("Conteo físico (faltante)");
    }
  };

  if (!isOpen || !producto || !variante) return null;

  const imagen =
    getVarianteImagenPrincipal(variante) ||
    (producto.variantes?.[0] ? getVarianteImagenPrincipal(producto.variantes[0]) : "");

  const stockFisicoActual = Number(variante.stock || 0);
  const stockReservadoActual = Number(variante.stockReservado || 0);
  const stockDisponibleActual = Math.max(0, stockFisicoActual - stockReservadoActual);
  const precioCosto = Number(variante.precioCosto || producto.precioCosto || 0);

  // Calcular stock resultante proyectado
  const stockResultante =
    tipo === "ENTRADA"
      ? stockFisicoActual + cantidad
      : Math.max(0, stockFisicoActual - cantidad);

  // Validaciones
  const esSalidaInvalida = tipo === "SALIDA" && cantidad > stockDisponibleActual;

  const quickMotivosEntrada = [
    "Conteo físico (sobrante)",
    "Regularización de inventario",
    "Mercadería recuperada",
    "Ajuste por diferencia de empaque",
  ];

  const quickMotivosSalida = [
    "Conteo físico (faltante)",
    "Prenda dañada / rotura",
    "Merma en exhibición",
    "Extravío en tienda",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (cantidad <= 0) {
      setErrorMsg("La cantidad debe ser mayor a 0");
      return;
    }

    if (esSalidaInvalida) {
      setErrorMsg(`No puedes dar salida a más de ${stockDisponibleActual} u. disponibles`);
      return;
    }

    try {
      setLoading(true);
      await ajustarStockInventario({
        productoId: producto._id,
        varianteId: variante.varianteId,
        color: variante.color,
        colorSecundario: variante.colorSecundario,
        talla: variante.talla,
        tipo,
        cantidad,
        motivo: motivo.trim() || undefined,
        referencia: referencia.trim() || undefined,
        sucursalId: sucursalSeleccionadaId || undefined,
      });

      setSuccessMsg(
        tipo === "ENTRADA"
          ? `¡Ajuste aplicado! Se añadieron +${cantidad} u. correctamente.`
          : `¡Ajuste aplicado! Se descontaron -${cantidad} u. correctamente.`
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar el ajuste de stock";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={!loading ? onClose : undefined}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 transition-colors">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-sky-100 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-400 font-bold border border-sky-200 dark:border-cyan-500/20 shrink-0 text-lg">
              ⚖️
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Ajuste de Stock Real
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                Regularizar sobrante o faltante físico sin compras falsas
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white text-xs font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* RESUMEN DE LA PRENDA Y VARIANTE */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <div className="relative h-12 w-12 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 overflow-hidden shrink-0 flex items-center justify-center">
              {imagen ? (
                <CloudinaryImage
                  src={imagen}
                  alt={producto.nombre}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl">👕</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-cyan-400 uppercase">
                {producto.sku}
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {producto.nombre}
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 font-medium text-slate-800 dark:text-gray-200 capitalize">
                  Color: {variante.color}
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-cyan-950/40 font-mono font-bold text-sky-800 dark:text-cyan-300">
                  Talla: {variante.talla}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 font-mono font-semibold text-emerald-800 dark:text-emerald-300 ml-auto">
                  CPP: {formatMoney(precioCosto)}
                </span>
              </div>
            </div>
          </div>

          {/* ESTADO ACTUAL Y PROYECCIÓN */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/60 shadow-sm">
              <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-medium">
                Físico Actual
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {stockFisicoActual} u.
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/60 shadow-sm">
              <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-medium">
                Disponible
              </span>
              <span className="text-sm sm:text-base font-bold text-sky-700 dark:text-cyan-300 font-mono">
                {stockDisponibleActual} u.
              </span>
            </div>

            <div
              className={`p-2.5 rounded-xl border shadow-sm ${
                tipo === "ENTRADA"
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                  : "border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-950/20"
              }`}
            >
              <span
                className={`text-[10px] block font-bold ${
                  tipo === "ENTRADA"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }`}
              >
                Nuevo Stock Resultante
              </span>
              <span
                className={`text-sm sm:text-base font-extrabold font-mono ${
                  tipo === "ENTRADA"
                    ? "text-emerald-800 dark:text-emerald-300"
                    : "text-rose-800 dark:text-rose-300"
                }`}
              >
                {stockResultante} u.
              </span>
            </div>
          </div>

          {/* TIPO DE AJUSTE (SOBRANTE vs FALTANTE) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 block">
              Tipo de Ajuste Físico
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleCambiarTipo("ENTRADA")}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                  tipo === "ENTRADA"
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>📈</span> Sobrante Físico
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                    + ENTRADA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-tight">
                  Hay más prendas en tienda que en el sistema. Suma stock al CPP actual.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleCambiarTipo("SALIDA")}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                  tipo === "SALIDA"
                    ? "border-rose-500 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/30 shadow-md ring-2 ring-rose-500/20"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <span>📉</span> Faltante / Merma
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                    - SALIDA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-tight">
                  Prendas rotas, extraviadas o faltantes. Resta stock valorado al CPP.
                </p>
              </button>
            </div>
          </div>

          {/* SUCURSAL DESTINO */}
          {sucursales.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 block">
                Sucursal o Tienda donde se realiza el ajuste
              </label>
              <select
                value={sucursalSeleccionadaId}
                onChange={(e) => setSucursalSeleccionadaId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {sucursales.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.nombre} ({s.codigo} - {s.tipo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CANTIDAD A AJUSTAR */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center justify-between">
              <span>Cantidad de prendas a {tipo === "ENTRADA" ? "adicionar" : "descontar"}</span>
              <span className="text-[11px] font-mono font-bold text-sky-700 dark:text-cyan-400">
                {tipo === "ENTRADA" ? `+${cantidad}` : `-${cantidad}`} u.
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                className="h-10 w-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-base transition flex items-center justify-center cursor-pointer"
              >
                -
              </button>

              <input
                type="number"
                min="1"
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-10 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 text-center text-base font-extrabold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <button
                type="button"
                onClick={() => setCantidad((prev) => prev + 1)}
                className="h-10 w-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-base transition flex items-center justify-center cursor-pointer"
              >
                +
              </button>

              {/* Botones rápidos */}
              <div className="flex items-center gap-1">
                {[5, 10].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCantidad((prev) => prev + step)}
                    className="h-10 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-mono font-semibold text-slate-700 dark:text-gray-300 transition cursor-pointer"
                  >
                    +{step}
                  </button>
                ))}
              </div>
            </div>

            {esSalidaInvalida && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                ⚠️ No puedes descontar {cantidad} prendas porque solo hay {stockDisponibleActual} disponibles.
              </p>
            )}
          </div>

          {/* MOTIVO DEL AJUSTE */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 block">
              Motivo del Ajuste
            </label>

            {/* Pills de motivos frecuentes */}
            <div className="flex flex-wrap gap-1.5">
              {(tipo === "ENTRADA" ? quickMotivosEntrada : quickMotivosSalida).map((qMotivo) => (
                <button
                  key={qMotivo}
                  type="button"
                  onClick={() => setMotivo(qMotivo)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    motivo === qMotivo
                      ? "bg-sky-600 text-white dark:bg-cyan-600"
                      : "border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10"
                  }`}
                >
                  {qMotivo}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Especifica el motivo del ajuste..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
            />
          </div>

          {/* REFERENCIA */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 block">
              Referencia / Documento de Respaldo <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: CONTEO_OCTUBRE, ACTA_001, etc."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
            />
          </div>

          {/* MENSAJES DE ESTADO */}
          {errorMsg && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300 text-xs font-medium animate-in fade-in">
              ❌ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
              ✅ {successMsg}
            </div>
          )}

          {/* NOTA DE AUDITORÍA Y KARDEX */}
          <div className="p-3 rounded-xl border border-sky-200/80 bg-sky-50/60 dark:border-cyan-500/20 dark:bg-cyan-950/20 text-[11px] text-sky-800 dark:text-cyan-300 flex items-start gap-2">
            <span className="text-sm shrink-0">ℹ️</span>
            <div>
              <p className="font-semibold">Impacto en Kardex Valorado:</p>
              <p className="text-[10px] text-slate-600 dark:text-gray-400 leading-tight mt-0.5">
                Este movimiento quedará asentado en el historial de inventario con fecha, usuario y el costo promedio auditado de{" "}
                <span className="font-bold text-sky-700 dark:text-cyan-400">{formatMoney(precioCosto)}</span>.
              </p>
            </div>
          </div>

          {/* FOOTER ACCIONES */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || esSalidaInvalida}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                tipo === "ENTRADA"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                  : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
              }`}
            >
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  <span>Aplicando ajuste...</span>
                </>
              ) : (
                <>
                  <span>{tipo === "ENTRADA" ? "📈" : "📉"}</span>
                  <span>Confirmar {tipo === "ENTRADA" ? "Sobrante (+)" : "Faltante (-)"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
