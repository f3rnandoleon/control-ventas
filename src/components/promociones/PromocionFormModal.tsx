"use client";

import { useEffect, useState } from "react";
import type {
  AlcancePromocion,
  EstadoPromocion,
  IPromocion,
  MetodoActivacionPromocion,
  TipoPromocion,
} from "@/types/promocion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  editing?: IPromocion | null;
}

function toDateTimeLocal(date?: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PromocionFormModal({
  isOpen,
  onClose,
  onSave,
  editing,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<EstadoPromocion>("ACTIVA");
  const [metodoActivacion, setMetodoActivacion] =
    useState<MetodoActivacionPromocion>("AUTOMATICA");
  const [tipo, setTipo] = useState<TipoPromocion>("PORCENTAJE");
  const [valor, setValor] = useState<number>(10);
  const [lleva, setLleva] = useState<number>(3);
  const [paga, setPaga] = useState<number>(2);
  const [descuentoMaximo, setDescuentoMaximo] = useState<string>("");
  const [alcance, setAlcance] = useState<AlcancePromocion>("PEDIDO");
  const [categoriasText, setCategoriasText] = useState("");
  const [montoMinimoCompra, setMontoMinimoCompra] = useState<number>(0);
  const [cantidadMinimaPrendas, setCantidadMinimaPrendas] = useState<number>(0);
  const [soloPrimeraCompra, setSoloPrimeraCompra] = useState(false);
  const [prioridad, setPrioridad] = useState<number>(10);
  const [acumulable, setAcumulable] = useState(false);
  const [acumulableConRebajasCatalogo, setAcumulableConRebajasCatalogo] =
    useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [usoMaximoTotal, setUsoMaximoTotal] = useState("");
  const [usoMaximoPorCliente, setUsoMaximoPorCliente] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editing) {
      setNombre(editing.nombre || "");
      setDescripcion(editing.descripcion || "");
      setEstado(editing.estado || "ACTIVA");
      setMetodoActivacion(editing.metodoActivacion || "AUTOMATICA");
      setTipo(editing.tipo || "PORCENTAJE");
      setValor(Number(editing.valor || 0));
      setLleva(Number(editing.reglaNxM?.lleva || 3));
      setPaga(Number(editing.reglaNxM?.paga || 2));
      setDescuentoMaximo(
        editing.descuentoMaximo ? String(editing.descuentoMaximo) : ""
      );
      setAlcance(editing.alcance || "PEDIDO");
      setCategoriasText((editing.categoriasIncluidas || []).join(", "));
      setMontoMinimoCompra(Number(editing.condiciones?.montoMinimoCompra || 0));
      setCantidadMinimaPrendas(
        Number(editing.condiciones?.cantidadMinimaPrendas || 0)
      );
      setSoloPrimeraCompra(Boolean(editing.condiciones?.soloPrimeraCompra));
      setPrioridad(Number(editing.prioridad ?? 10));
      setAcumulable(Boolean(editing.acumulable));
      setAcumulableConRebajasCatalogo(
        Boolean(editing.acumulableConRebajasCatalogo)
      );
      setFechaInicio(toDateTimeLocal(editing.fechaInicio));
      setFechaFin(toDateTimeLocal(editing.fechaFin));
      setUsoMaximoTotal(
        editing.usoMaximoTotal ? String(editing.usoMaximoTotal) : ""
      );
      setUsoMaximoPorCliente(
        editing.usoMaximoPorCliente ? String(editing.usoMaximoPorCliente) : ""
      );
    } else {
      setNombre("");
      setDescripcion("");
      setEstado("ACTIVA");
      setMetodoActivacion("AUTOMATICA");
      setTipo("PORCENTAJE");
      setValor(15);
      setLleva(3);
      setPaga(2);
      setDescuentoMaximo("");
      setAlcance("PEDIDO");
      setCategoriasText("");
      setMontoMinimoCompra(0);
      setCantidadMinimaPrendas(0);
      setSoloPrimeraCompra(false);
      setPrioridad(10);
      setAcumulable(false);
      setAcumulableConRebajasCatalogo(false);
      setFechaInicio("");
      setFechaFin("");
      setUsoMaximoTotal("");
      setUsoMaximoPorCliente("");
    }
  }, [editing, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const categoriasIncluidas =
        alcance === "CATEGORIAS"
          ? categoriasText
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [];

      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        estado,
        canales: ["WEB"],
        metodoActivacion,
        tipo,
        valor: tipo === "NXM" || tipo === "ENVIO_GRATIS" ? 0 : Number(valor || 0),
        reglaNxM: tipo === "NXM" ? { lleva: Number(lleva), paga: Number(paga) } : null,
        descuentoMaximo: descuentoMaximo ? Number(descuentoMaximo) : null,
        alcance: tipo === "ENVIO_GRATIS" ? "ENVIO" : alcance,
        categoriasIncluidas,
        condiciones: {
          montoMinimoCompra: Number(montoMinimoCompra || 0),
          cantidadMinimaPrendas: Number(cantidadMinimaPrendas || 0),
          soloPrimeraCompra,
        },
        prioridad: Number(prioridad || 10),
        acumulable,
        acumulableConRebajasCatalogo,
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
        fechaFin: fechaFin ? new Date(fechaFin).toISOString() : null,
        usoMaximoTotal: usoMaximoTotal ? Number(usoMaximoTotal) : null,
        usoMaximoPorCliente: usoMaximoPorCliente ? Number(usoMaximoPorCliente) : null,
      };

      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar promoción");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editing ? "Editar Promoción Web" : "Nueva Promoción Web"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aplica exclusivamente en el canal WEB. El POS físico no se ve afectado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label text-xs">Nombre de la campaña</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: 15% OFF Invierno Web / 3x2 en Chompas"
                className="input w-full"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label text-xs">Descripción pública (opcional)</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Texto corto para mostrar en el storefront web"
                className="input w-full"
              />
            </div>

            <div>
              <label className="label text-xs">Activación</label>
              <select
                value={metodoActivacion}
                onChange={(e) =>
                  setMetodoActivacion(e.target.value as MetodoActivacionPromocion)
                }
                className="input w-full"
              >
                <option value="AUTOMATICA">Automática en carrito</option>
                <option value="CUPON">Requiere código de cupón</option>
              </select>
            </div>

            <div>
              <label className="label text-xs">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoPromocion)}
                className="input w-full"
              >
                <option value="ACTIVA">Activa</option>
                <option value="PAUSADA">Pausada</option>
                <option value="BORRADOR">Borrador</option>
                <option value="FINALIZADA">Finalizada</option>
              </select>
            </div>

            <div>
              <label className="label text-xs">Tipo de beneficio</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoPromocion)}
                className="input w-full"
              >
                <option value="PORCENTAJE">Porcentaje (% OFF)</option>
                <option value="MONTO_FIJO">Monto Fijo (Bs OFF)</option>
                <option value="NXM">Combo NxM (2x1, 3x2)</option>
                <option value="SEGUNDA_UNIDAD">2da unidad al % OFF</option>
                <option value="ENVIO_GRATIS">Envío gratis</option>
              </select>
            </div>

            {tipo === "NXM" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Lleva</label>
                  <input
                    type="number"
                    min={2}
                    value={lleva}
                    onChange={(e) => setLleva(Number(e.target.value) || 2)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label text-xs">Paga</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, lleva - 1)}
                    value={paga}
                    onChange={(e) => setPaga(Number(e.target.value) || 1)}
                    className="input w-full"
                  />
                </div>
              </div>
            ) : tipo !== "ENVIO_GRATIS" ? (
              <div>
                <label className="label text-xs">
                  {tipo === "MONTO_FIJO" ? "Descuento (Bs)" : "Porcentaje (%)"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={tipo === "MONTO_FIJO" ? undefined : 100}
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(Number(e.target.value) || 0)}
                  className="input w-full"
                />
              </div>
            ) : (
              <div>
                <label className="label text-xs">Tope envío</label>
                <input
                  type="text"
                  disabled
                  value="Bonifica 100% del costoEnvio"
                  className="input w-full opacity-70"
                />
              </div>
            )}

            {tipo !== "ENVIO_GRATIS" && (
              <div>
                <label className="label text-xs">Alcance</label>
                <select
                  value={alcance}
                  onChange={(e) => setAlcance(e.target.value as AlcancePromocion)}
                  className="input w-full"
                >
                  <option value="PEDIDO">Todo el pedido</option>
                  <option value="CATEGORIAS">Por categorías</option>
                </select>
              </div>
            )}

            {(tipo === "PORCENTAJE" || tipo === "SEGUNDA_UNIDAD" || tipo === "NXM") && (
              <div>
                <label className="label text-xs">Tope máximo Bs (opcional)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={descuentoMaximo}
                  onChange={(e) => setDescuentoMaximo(e.target.value)}
                  placeholder="Sin tope"
                  className="input w-full"
                />
              </div>
            )}

            {alcance === "CATEGORIAS" && tipo !== "ENVIO_GRATIS" && (
              <div className="sm:col-span-2">
                <label className="label text-xs">
                  Categorías incluidas (separadas por coma)
                </label>
                <input
                  type="text"
                  required
                  value={categoriasText}
                  onChange={(e) => setCategoriasText(e.target.value)}
                  placeholder="Ej: Chompas, Poleras"
                  className="input w-full"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <div>
              <label className="label text-xs">Compra mínima (Bs)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={montoMinimoCompra}
                onChange={(e) => setMontoMinimoCompra(Number(e.target.value) || 0)}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label text-xs">Mín. prendas</label>
              <input
                type="number"
                min={0}
                value={cantidadMinimaPrendas}
                onChange={(e) =>
                  setCantidadMinimaPrendas(Number(e.target.value) || 0)
                }
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label text-xs">Prioridad (menor = primero)</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={prioridad}
                onChange={(e) => setPrioridad(Number(e.target.value) || 10)}
                className="input w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Fecha inicio (opcional)</label>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="input w-full text-xs"
              />
            </div>
            <div>
              <label className="label text-xs">Fecha fin (opcional)</label>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="input w-full text-xs"
              />
            </div>
            <div>
              <label className="label text-xs">Usos máximos globales (opcional)</label>
              <input
                type="number"
                min={1}
                value={usoMaximoTotal}
                onChange={(e) => setUsoMaximoTotal(e.target.value)}
                placeholder="Ilimitado"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label text-xs">Usos máximos por cliente (opcional)</label>
              <input
                type="number"
                min={1}
                value={usoMaximoPorCliente}
                onChange={(e) => setUsoMaximoPorCliente(e.target.value)}
                placeholder="Ilimitado"
                className="input w-full text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={soloPrimeraCompra}
                onChange={(e) => setSoloPrimeraCompra(e.target.checked)}
              />
              <span>Solo primera compra del cliente</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acumulable}
                onChange={(e) => setAcumulable(e.target.checked)}
              />
              <span>Acumulable con otras promociones/cupones</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acumulableConRebajasCatalogo}
                onChange={(e) =>
                  setAcumulableConRebajasCatalogo(e.target.checked)
                }
              />
              <span>
                Acumulable con productos que ya tienen rebaja &quot;Antes / Ahora&quot;
                (desactivado por defecto)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-5 py-2 text-sm"
            >
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear promoción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
