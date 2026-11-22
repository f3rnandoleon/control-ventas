"use client";

import { useState, useEffect, useMemo } from "react";
import type { ProductoInventario } from "@/types/inventario";
import type { Variante } from "@/types/producto";
import type { Sucursal } from "@/types/sucursal";
import { getSucursales } from "@/services/sucursales.service";
import { reclasificarVarianteInventario } from "@/services/inventario.service";
import { formatMoney } from "@/utils/pricing";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import {
  TALLA_OPTIONS,
  getColorOptions,
  type ColorOption,
} from "@/constants/variant-options";

interface NivelStockSucursalAPI {
  _id: string;
  sucursalId:
    | {
        _id: string;
        nombre: string;
        codigo: string;
        tipo: string;
        activa?: boolean;
      }
    | string;
  varianteId: string;
  stockFisico: number;
  stockReservado: number;
}

interface ReclasificarVarianteModalProps {
  isOpen: boolean;
  producto: ProductoInventario | null;
  variante: Variante | null;
  initialSucursalId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const renderGroupedColorOptions = (options: ColorOption[]) => {
  const groups: Record<string, ColorOption[]> = {};
  for (const opt of options) {
    const fam = opt.family || "Otros";
    if (!groups[fam]) groups[fam] = [];
    groups[fam].push(opt);
  }

  return Object.entries(groups).map(([family, items]) => (
    <optgroup key={family} label={`── ${family} ──`}>
      {items.map((color) => (
        <option key={color.value} value={color.value}>
          {color.label}
        </option>
      ))}
    </optgroup>
  ));
};

const normalizeVariantKey = (
  color: string,
  colorSecundario: string | undefined,
  talla: string
) =>
  `${color.trim().toLowerCase()}::${(colorSecundario || "")
    .trim()
    .toLowerCase()}::${talla.trim().toLowerCase()}`;

export default function ReclasificarVarianteModal({
  isOpen,
  producto,
  variante,
  initialSucursalId,
  onClose,
  onSuccess,
}: ReclasificarVarianteModalProps) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [nivelesProducto, setNivelesProducto] = useState<NivelStockSucursalAPI[]>([]);
  const [loadingStockData, setLoadingStockData] = useState(false);

  const [sucursalSeleccionadaId, setSucursalSeleccionadaId] = useState<string>("");
  const [modoDestino, setModoDestino] = useState<"EXISTENTE" | "NUEVA">("EXISTENTE");
  const [varianteDestinoId, setVarianteDestinoId] = useState<string>("");
  const [nuevaTalla, setNuevaTalla] = useState<string>("");
  const [tallaPersonalizada, setTallaPersonalizada] = useState<string>("");
  const [cambiarColor, setCambiarColor] = useState<boolean>(false);
  const [nuevoColor, setNuevoColor] = useState<string>("");
  const [nuevoColorSecundario, setNuevoColorSecundario] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>("Error al registrar talla en ingreso");
  const [referencia, setReferencia] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    codigoBarra?: string;
    creadaNueva?: boolean;
  } | null>(null);

  // Otras variantes del mismo producto (mismo color primero)
  const otrasVariantes = useMemo(() => {
    if (!producto || !variante) return [];
    const origenKey = normalizeVariantKey(
      variante.color,
      variante.colorSecundario,
      variante.talla
    );
    const list = (producto.variantes || []).filter((v) => {
      if (variante.varianteId && v.varianteId) {
        return v.varianteId !== variante.varianteId;
      }
      return (
        normalizeVariantKey(v.color, v.colorSecundario, v.talla) !== origenKey
      );
    });

    const origenColorNorm = variante.color.trim().toLowerCase();
    const origenSecNorm = (variante.colorSecundario || "").trim().toLowerCase();

    return [...list].sort((a, b) => {
      const aSameColor =
        a.color.trim().toLowerCase() === origenColorNorm &&
        (a.colorSecundario || "").trim().toLowerCase() === origenSecNorm;
      const bSameColor =
        b.color.trim().toLowerCase() === origenColorNorm &&
        (b.colorSecundario || "").trim().toLowerCase() === origenSecNorm;
      if (aSameColor && !bSameColor) return -1;
      if (!aSameColor && bSameColor) return 1;
      if (a.color !== b.color) return a.color.localeCompare(b.color, "es");
      return a.talla.localeCompare(b.talla, "es");
    });
  }, [producto, variante]);

  // Cargar sucursales y niveles reales de stock por sucursal del producto
  useEffect(() => {
    if (!isOpen || !producto || !variante) return;

    let isMounted = true;
    setLoadingStockData(true);

    Promise.all([
      getSucursales().catch(() => [] as Sucursal[]),
      fetch(`/api/admin/productos/${producto._id}/stock-sucursales`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => [] as NivelStockSucursalAPI[]),
    ])
      .then(([sucsData, nivelesData]) => {
        if (!isMounted) return;
        const activas = sucsData.filter((s) => s.activa);
        setSucursales(activas);
        setNivelesProducto(Array.isArray(nivelesData) ? nivelesData : []);

        // Determinar mejor sucursal inicial: priorizar initialSucursalId si tiene stock, si no la primera con stock disponible
        const getDispEnSuc = (sId: string) => {
          const match = (Array.isArray(nivelesData) ? nivelesData : []).find((n) => {
            const nSucId =
              typeof n.sucursalId === "string" ? n.sucursalId : n.sucursalId?._id;
            return nSucId === sId && n.varianteId === variante.varianteId;
          });
          if (match) {
            return Math.max(
              0,
              Number(match.stockFisico || 0) - Number(match.stockReservado || 0)
            );
          }
          const fromProp = variante.sucursalesStock?.find((s) => s.sucursalId === sId);
          return fromProp ? Math.max(0, Number(fromProp.stockDisponible || 0)) : 0;
        };

        if (
          initialSucursalId &&
          initialSucursalId !== "TODAS" &&
          activas.some((s) => s._id === initialSucursalId) &&
          getDispEnSuc(initialSucursalId) > 0
        ) {
          setSucursalSeleccionadaId(initialSucursalId);
        } else {
          const conStock = activas.find((s) => getDispEnSuc(s._id) > 0);
          setSucursalSeleccionadaId(conStock?._id || activas[0]?._id || "");
        }
      })
      .finally(() => {
        if (isMounted) setLoadingStockData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, producto, variante, initialSucursalId]);

  // Reiniciar campos del formulario al abrir
  useEffect(() => {
    if (!isOpen || !variante) return;
    setCantidad(1);
    setMotivo("Error al registrar talla en ingreso");
    setReferencia("");
    setErrorMsg(null);
    setSuccessInfo(null);
    setCambiarColor(false);
    setNuevoColor(variante.color);
    setNuevoColorSecundario(variante.colorSecundario || "");
    setNuevaTalla("");
    setTallaPersonalizada("");

    if (otrasVariantes.length > 0) {
      setModoDestino("EXISTENTE");
      setVarianteDestinoId(otrasVariantes[0].varianteId || "");
    } else {
      setModoDestino("NUEVA");
      setVarianteDestinoId("");
    }
  }, [isOpen, variante, otrasVariantes]);

  // Mapa de stock por (sucursalId + varianteId)
  const stockSucursalMap = useMemo(() => {
    const map = new Map<
      string,
      { fisico: number; reservado: number; disponible: number }
    >();

    // Primero cargar lo que venga en producto.variantes[].sucursalesStock
    for (const v of producto?.variantes || []) {
      if (!v.varianteId || !v.sucursalesStock) continue;
      for (const s of v.sucursalesStock) {
        const fis = Math.max(0, Number(s.stockFisico || 0));
        const res = Math.max(0, Number(s.stockReservado || 0));
        map.set(`${s.sucursalId}_${v.varianteId}`, {
          fisico: fis,
          reservado: res,
          disponible: Math.max(0, fis - res),
        });
      }
    }

    // Sobrescribir con lectura fresca de /stock-sucursales
    for (const n of nivelesProducto) {
      const sId =
        typeof n.sucursalId === "string" ? n.sucursalId : n.sucursalId?._id;
      if (!sId || !n.varianteId) continue;
      const fis = Math.max(0, Number(n.stockFisico || 0));
      const res = Math.max(0, Number(n.stockReservado || 0));
      map.set(`${sId}_${n.varianteId}`, {
        fisico: fis,
        reservado: res,
        disponible: Math.max(0, fis - res),
      });
    }

    return map;
  }, [producto, nivelesProducto]);

  const getStockVarianteEnSucursal = (
    v: Variante | null | undefined,
    sId: string
  ) => {
    if (!v) return { fisico: 0, reservado: 0, disponible: 0 };
    if (sId && v.varianteId) {
      const entry = stockSucursalMap.get(`${sId}_${v.varianteId}`);
      if (entry) return entry;
      // Si el producto no tiene ningún registro en NivelStock para esta variante (legacy), usar global solo si no hay otros niveles
      const tieneAlgunNivel = Array.from(stockSucursalMap.keys()).some((k) =>
        k.endsWith(`_${v.varianteId}`)
      );
      if (!tieneAlgunNivel) {
        const fis = Math.max(0, Number(v.stock || 0));
        const res = Math.max(0, Number(v.stockReservado || 0));
        return { fisico: fis, reservado: res, disponible: Math.max(0, fis - res) };
      }
      return { fisico: 0, reservado: 0, disponible: 0 };
    }
    const fis = Math.max(0, Number(v.stock || 0));
    const res = Math.max(0, Number(v.stockReservado || 0));
    return { fisico: fis, reservado: res, disponible: Math.max(0, fis - res) };
  };

  if (!isOpen || !producto || !variante) return null;

  const imagen =
    getVarianteImagenPrincipal(variante) ||
    (producto.variantes?.[0]
      ? getVarianteImagenPrincipal(producto.variantes[0])
      : "");

  const stockOrigenSucursal = getStockVarianteEnSucursal(
    variante,
    sucursalSeleccionadaId
  );
  const stockGlobalDisponibleOrigen = Math.max(
    0,
    Number(variante.stock || 0) - Number(variante.stockReservado || 0)
  );
  const maxCantidadMovible = Math.min(
    stockOrigenSucursal.disponible,
    stockGlobalDisponibleOrigen
  );

  const varianteDestinoSeleccionada =
    modoDestino === "EXISTENTE"
      ? otrasVariantes.find((v) => v.varianteId === varianteDestinoId) || null
      : null;

  const colorDestinoFinal = (cambiarColor ? nuevoColor : variante.color).trim();
  const colorSecDestinoFinal = cambiarColor
    ? nuevoColorSecundario.trim()
    : (variante.colorSecundario || "").trim();
  const tallaDestinoFinal = (
    nuevaTalla === "__OTRA__" ? tallaPersonalizada : nuevaTalla
  ).trim();

  // Verificar si en modo NUEVA la combinación elegida ya existe en el producto
  const coincidenciaExistenteEnNueva =
    modoDestino === "NUEVA" && colorDestinoFinal && tallaDestinoFinal
      ? (producto.variantes || []).find(
          (v) =>
            normalizeVariantKey(v.color, v.colorSecundario, v.talla) ===
            normalizeVariantKey(
              colorDestinoFinal,
              colorSecDestinoFinal,
              tallaDestinoFinal
            )
        ) || null
      : null;

  const esMismaQueOrigenEnNueva = Boolean(
    coincidenciaExistenteEnNueva &&
      (coincidenciaExistenteEnNueva.varianteId === variante.varianteId ||
        normalizeVariantKey(
          coincidenciaExistenteEnNueva.color,
          coincidenciaExistenteEnNueva.colorSecundario,
          coincidenciaExistenteEnNueva.talla
        ) ===
          normalizeVariantKey(
            variante.color,
            variante.colorSecundario,
            variante.talla
          ))
  );

  const destinoPreviewVariante =
    modoDestino === "EXISTENTE"
      ? varianteDestinoSeleccionada
      : coincidenciaExistenteEnNueva && !esMismaQueOrigenEnNueva
        ? coincidenciaExistenteEnNueva
        : null;

  const stockDestinoSucursal = destinoPreviewVariante
    ? getStockVarianteEnSucursal(destinoPreviewVariante, sucursalSeleccionadaId)
    : { fisico: 0, reservado: 0, disponible: 0 };

  const precioCostoOrigen = Number(
    variante.precioCosto || producto.precioCosto || 0
  );

  const sucursalObj = sucursales.find((s) => s._id === sucursalSeleccionadaId);

  const cantidadInvalida =
    cantidad < 1 || maxCantidadMovible <= 0 || cantidad > maxCantidadMovible;

  const destinoInvalido =
    modoDestino === "EXISTENTE"
      ? !varianteDestinoSeleccionada
      : !colorDestinoFinal || !tallaDestinoFinal || esMismaQueOrigenEnNueva;

  const quickMotivos = [
    "Error al registrar talla en ingreso",
    "Etiqueta de fábrica incorrecta",
    "Corrección por conteo físico",
    "Error en color registrado",
  ];

  const colorOptions = getColorOptions(nuevoColor);
  const secondaryColorOptions = getColorOptions(nuevoColorSecundario);

  // Tallas existentes para el color destino elegido (para mostrar marca en el selector)
  const tallasYaExistentesParaColorDestino = new Set(
    (producto.variantes || [])
      .filter(
        (v) =>
          v.color.trim().toLowerCase() === colorDestinoFinal.toLowerCase() &&
          (v.colorSecundario || "").trim().toLowerCase() ===
            colorSecDestinoFinal.toLowerCase()
      )
      .map((v) => v.talla.trim().toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    if (cantidadInvalida) {
      setErrorMsg(
        maxCantidadMovible <= 0
          ? "No hay stock disponible de esta variante en la sucursal seleccionada"
          : `Solo puedes reclasificar hasta ${maxCantidadMovible} u. disponibles en esta sucursal`
      );
      return;
    }

    if (destinoInvalido) {
      setErrorMsg(
        esMismaQueOrigenEnNueva
          ? "La variante destino no puede ser igual a la variante origen"
          : "Selecciona una variante o talla destino válida"
      );
      return;
    }

    try {
      setLoading(true);
      const res = await reclasificarVarianteInventario({
        productoId: producto._id,
        sucursalId: sucursalSeleccionadaId || undefined,
        varianteOrigenId: variante.varianteId,
        origenColor: variante.color,
        origenColorSecundario: variante.colorSecundario,
        origenTalla: variante.talla,
        ...(modoDestino === "EXISTENTE"
          ? {
              varianteDestinoId: varianteDestinoSeleccionada?.varianteId,
            }
          : {
              crearNuevaVariante: true,
              destinoColor: colorDestinoFinal,
              destinoColorSecundario: colorSecDestinoFinal || undefined,
              destinoTalla: tallaDestinoFinal,
            }),
        cantidad,
        motivo: motivo.trim() || undefined,
        referencia: referencia.trim() || undefined,
      });

      setSuccessInfo({
        message: res.message,
        codigoBarra: res.varianteDestino?.codigoBarra,
        creadaNueva: res.creadaNuevaVariante,
      });

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al reclasificar la variante";
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
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold border border-violet-200 dark:border-violet-500/30 shrink-0 text-lg">
              🔄
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Reclasificar Talla / Variante
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                Mueve stock entre tallas o colores en 1 paso manteniendo sucursal y CPP
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

        {/* CONTENIDO */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
        >
          {/* VARIANTE ORIGEN */}
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-violet-700 dark:text-violet-400 uppercase">
                  Origen · {producto.sku}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 font-mono text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                  CPP: {formatMoney(precioCostoOrigen)}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {producto.nombre}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 font-medium text-slate-800 dark:text-gray-200 capitalize">
                  {variante.color}
                  {variante.colorSecundario ? ` / ${variante.colorSecundario}` : ""}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 font-mono font-bold text-rose-700 dark:text-rose-300">
                  Talla actual: {variante.talla}
                </span>
              </div>
            </div>
          </div>

          {/* SUCURSAL DONDE ESTÁ LA PRENDA */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center justify-between">
              <span>Sucursal donde se encuentra la prenda</span>
              {loadingStockData && (
                <span className="text-[10px] text-slate-400">Cargando stock...</span>
              )}
            </label>
            <select
              value={sucursalSeleccionadaId}
              onChange={(e) => {
                setSucursalSeleccionadaId(e.target.value);
                setCantidad(1);
                setErrorMsg(null);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {sucursales.map((s) => {
                const st = getStockVarianteEnSucursal(variante, s._id);
                return (
                  <option key={s._id} value={s._id}>
                    {s.nombre} ({s.codigo}) — {st.disponible} u. disponibles
                  </option>
                );
              })}
            </select>
            {maxCantidadMovible <= 0 && !loadingStockData && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                ⚠️ Esta sucursal no tiene stock disponible de la talla {variante.talla}. Selecciona otra sucursal con existencias.
              </p>
            )}
          </div>

          {/* MODO DESTINO: EXISTENTE vs NUEVA TALLA */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 block">
              Destino (Talla / Variante Real)
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={otrasVariantes.length === 0}
                onClick={() => {
                  setModoDestino("EXISTENTE");
                  setErrorMsg(null);
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  modoDestino === "EXISTENTE"
                    ? "border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/30 ring-2 ring-violet-500/20"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="text-xs font-extrabold text-violet-700 dark:text-violet-300 block">
                  📦 Variante existente
                </span>
                <span className="text-[10px] text-slate-500 dark:text-gray-400">
                  {otrasVariantes.length > 0
                    ? `Elegir entre ${otrasVariantes.length} registradas`
                    : "No hay otras variantes"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoDestino("NUEVA");
                  setErrorMsg(null);
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  modoDestino === "NUEVA"
                    ? "border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/30 ring-2 ring-violet-500/20"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="text-xs font-extrabold text-violet-700 dark:text-violet-300 block">
                  ✨ Crear nueva talla
                </span>
                <span className="text-[10px] text-slate-500 dark:text-gray-400">
                  Crea la variante y mueve el stock
                </span>
              </button>
            </div>

            {modoDestino === "EXISTENTE" ? (
              <div className="space-y-1 pt-1">
                <select
                  value={varianteDestinoId}
                  onChange={(e) => {
                    setVarianteDestinoId(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Selecciona la variante destino...</option>
                  {otrasVariantes.map((v) => {
                    const stDest = getStockVarianteEnSucursal(
                      v,
                      sucursalSeleccionadaId
                    );
                    const mismoColor =
                      v.color.trim().toLowerCase() ===
                        variante.color.trim().toLowerCase() &&
                      (v.colorSecundario || "").trim().toLowerCase() ===
                        (variante.colorSecundario || "").trim().toLowerCase();
                    return (
                      <option
                        key={v.varianteId || `${v.color}-${v.talla}`}
                        value={v.varianteId || ""}
                      >
                        {mismoColor ? "★ " : ""}
                        {v.color}
                        {v.colorSecundario ? ` / ${v.colorSecundario}` : ""} — Talla{" "}
                        {v.talla} (Stock aquí: {stDest.fisico} u.)
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-gray-400">
                  ★ indica variantes del mismo color ({variante.color}).
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-violet-200/80 dark:border-violet-500/20 bg-violet-50/40 dark:bg-violet-950/15 p-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 block">
                    Nueva talla real
                  </label>
                  <select
                    value={nuevaTalla}
                    onChange={(e) => {
                      setNuevaTalla(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Selecciona la talla real (S, M, XL...)...</option>
                    {TALLA_OPTIONS.map((t) => {
                      const yaExiste = tallasYaExistentesParaColorDestino.has(
                        t.toLowerCase()
                      );
                      const esOrigen =
                        !cambiarColor &&
                        t.toLowerCase() === variante.talla.trim().toLowerCase();
                      return (
                        <option key={t} value={t} disabled={esOrigen}>
                          Talla {t}
                          {esOrigen
                            ? " (talla actual)"
                            : yaExiste
                              ? " (ya existe — sumará al stock existente)"
                              : " (se creará nueva)"}
                        </option>
                      );
                    })}
                    <option value="__OTRA__">Otra talla personalizada...</option>
                  </select>

                  {nuevaTalla === "__OTRA__" && (
                    <input
                      type="text"
                      value={tallaPersonalizada}
                      onChange={(e) => setTallaPersonalizada(e.target.value)}
                      placeholder="Ej: 3XL, Única, 38..."
                      maxLength={20}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  )}
                </div>

                {/* Opción para también corregir color si aplica */}
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cambiarColor}
                    onChange={(e) => setCambiarColor(e.target.checked)}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>También corregir el color (actual: {variante.color})</span>
                </label>

                {cambiarColor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 dark:text-gray-400 block mb-1">
                        Color principal
                      </label>
                      <select
                        value={nuevoColor}
                        onChange={(e) => setNuevoColor(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">Selecciona color</option>
                        {renderGroupedColorOptions(colorOptions)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 dark:text-gray-400 block mb-1">
                        Color secundario (opc.)
                      </label>
                      <select
                        value={nuevoColorSecundario}
                        onChange={(e) => setNuevoColorSecundario(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">Ninguno</option>
                        {renderGroupedColorOptions(secondaryColorOptions)}
                      </select>
                    </div>
                  </div>
                )}

                {esMismaQueOrigenEnNueva && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    ⚠️ El destino coincide exactamente con la variante actual. Elige otra talla o color.
                  </p>
                )}

                {coincidenciaExistenteEnNueva && !esMismaQueOrigenEnNueva && (
                  <p className="text-[11px] text-sky-700 dark:text-cyan-300">
                    ℹ️ Esa combinación ya existe en el catálogo: se transferirá directamente a su stock existente sin duplicar variantes.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* CANTIDAD A RECLASIFICAR */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center justify-between">
              <span>Cantidad de prendas a cambiar</span>
              <span className="text-[11px] font-mono font-bold text-violet-700 dark:text-violet-400">
                Máx. {maxCantidadMovible} u. en {sucursalObj?.codigo || "sucursal"}
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
                min={1}
                max={Math.max(1, maxCantidadMovible)}
                step={1}
                value={cantidad}
                onChange={(e) =>
                  setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="h-10 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 text-center text-base font-extrabold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />

              <button
                type="button"
                onClick={() =>
                  setCantidad((prev) =>
                    maxCantidadMovible > 0
                      ? Math.min(maxCantidadMovible, prev + 1)
                      : prev + 1
                  )
                }
                className="h-10 w-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-base transition flex items-center justify-center cursor-pointer"
              >
                +
              </button>

              {maxCantidadMovible > 1 && (
                <button
                  type="button"
                  onClick={() => setCantidad(maxCantidadMovible)}
                  className="h-10 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-gray-300 transition cursor-pointer"
                >
                  Todas ({maxCantidadMovible})
                </button>
              )}
            </div>
          </div>

          {/* PREVIEW ANTES -> DESPUÉS */}
          {!destinoInvalido && maxCantidadMovible > 0 && (
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50/70 dark:bg-rose-950/20">
                <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300 block">
                  Sale de ({variante.color} · T.{variante.talla})
                </span>
                <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                  <span className="text-slate-500 dark:text-gray-400 line-through text-xs">
                    {stockOrigenSucursal.fisico} u.
                  </span>
                  <span className="text-rose-700 dark:text-rose-300 font-extrabold text-base">
                    → {Math.max(0, stockOrigenSucursal.fisico - cantidad)} u.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/70 dark:bg-emerald-950/20">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block truncate">
                  Entra a (
                  {destinoPreviewVariante
                    ? `${destinoPreviewVariante.color} · T.${destinoPreviewVariante.talla}`
                    : `${colorDestinoFinal} · T.${tallaDestinoFinal} · NUEVA`}
                  )
                </span>
                <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                  <span className="text-slate-500 dark:text-gray-400 text-xs">
                    {stockDestinoSucursal.fisico} u.
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-base">
                    → {stockDestinoSucursal.fisico + cantidad} u.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* MOTIVO */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 block">
              Motivo de la reclasificación
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickMotivos.map((qMotivo) => (
                <button
                  key={qMotivo}
                  type="button"
                  onClick={() => setMotivo(qMotivo)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    motivo === qMotivo
                      ? "bg-violet-600 text-white"
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
              placeholder="Ej: Prenda física es M pero estaba registrada como L"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400"
            />
          </div>

          {/* REFERENCIA OPCIONAL */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 block">
              Referencia <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Auto-generado si lo dejas vacío (ej: RECLASIF-...)"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400"
            />
          </div>

          {/* MENSAJES */}
          {errorMsg && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300 text-xs font-medium">
              ❌ {errorMsg}
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs space-y-1">
              <p className="font-semibold">✅ {successInfo.message}</p>
              {successInfo.codigoBarra && (
                <p className="font-mono text-[11px]">
                  Código destino: <strong>{successInfo.codigoBarra}</strong> (recuerda actualizar la etiqueta física si corresponde).
                </p>
              )}
            </div>
          )}

          {/* NOTA CONTABLE */}
          <div className="p-3 rounded-xl border border-violet-200/80 bg-violet-50/60 dark:border-violet-500/20 dark:bg-violet-950/20 text-[11px] text-violet-900 dark:text-violet-200 flex items-start gap-2">
            <span className="text-sm shrink-0">ℹ️</span>
            <p className="text-[10px] text-slate-600 dark:text-gray-300 leading-tight">
              Esta operación es atómica: descuenta la variante origen y suma a la destino en la misma sucursal, transfiere el costo CPP ({formatMoney(precioCostoOrigen)}) sin distorsionar tu inventario valorado y deja ambos registros vinculados en el Kárdex.
            </p>
          </div>

          {/* FOOTER */}
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
              disabled={loading || cantidadInvalida || destinoInvalido}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  <span>Reclasificando...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Confirmar Reclasificación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
