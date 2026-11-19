"use client";

import { useEffect, useState } from "react";
import type { ICupon, IPromocion } from "@/types/promocion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  promociones: IPromocion[];
  editing?: ICupon | null;
}

export default function CuponFormModal({
  isOpen,
  onClose,
  onSave,
  promociones,
  editing,
}: Props) {
  const cuponPromos = promociones.filter((p) => p.metodoActivacion === "CUPON");
  const [codigo, setCodigo] = useState("");
  const [promocionId, setPromocionId] = useState("");
  const [activo, setActivo] = useState(true);
  const [usoMaximoTotal, setUsoMaximoTotal] = useState("");
  const [usoMaximoPorCliente, setUsoMaximoPorCliente] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editing) {
      setCodigo(editing.codigo || "");
      const promoRef =
        typeof editing.promocionId === "string"
          ? editing.promocionId
          : editing.promocionId?._id || "";
      setPromocionId(promoRef);
      setActivo(Boolean(editing.activo));
      setUsoMaximoTotal(editing.usoMaximoTotal ? String(editing.usoMaximoTotal) : "");
      setUsoMaximoPorCliente(
        editing.usoMaximoPorCliente ? String(editing.usoMaximoPorCliente) : ""
      );
    } else {
      setCodigo("");
      setPromocionId(cuponPromos[0]?._id || promociones[0]?._id || "");
      setActivo(true);
      setUsoMaximoTotal("");
      setUsoMaximoPorCliente("1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, isOpen]);

  if (!isOpen) return null;

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 6; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    setCodigo(`ANDES-${suffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        codigo: codigo.trim().toUpperCase(),
        promocionId,
        activo,
        usoMaximoTotal: usoMaximoTotal ? Number(usoMaximoTotal) : null,
        usoMaximoPorCliente: usoMaximoPorCliente ? Number(usoMaximoPorCliente) : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cupón");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {editing ? "Editar Cupón" : "Nuevo Cupón Web"}
          </h2>
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

          <div>
            <label className="label text-xs">Código del cupón</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: INVIERNO15"
                className="input flex-1 font-mono uppercase"
              />
              <button
                type="button"
                onClick={generateRandomCode}
                className="rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Generar
              </button>
            </div>
          </div>

          <div>
            <label className="label text-xs">Promoción asociada</label>
            <select
              required
              value={promocionId}
              onChange={(e) => setPromocionId(e.target.value)}
              className="input w-full"
            >
              <option value="" disabled>
                Seleccione una promoción
              </option>
              {(cuponPromos.length > 0 ? cuponPromos : promociones).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nombre} ({p.tipo})
                </option>
              ))}
            </select>
            {cuponPromos.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Crea primero una promoción con activación &quot;Requiere código de cupón&quot;.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Límite global</label>
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
              <label className="label text-xs">Límite por cliente</label>
              <input
                type="number"
                min={1}
                value={usoMaximoPorCliente}
                onChange={(e) => setUsoMaximoPorCliente(e.target.value)}
                placeholder="Ej: 1"
                className="input w-full text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            <span>Cupón activo</span>
          </label>

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
              disabled={saving || !promocionId}
              className="btn-primary px-5 py-2 text-sm"
            >
              {saving ? "Guardando..." : editing ? "Actualizar" : "Crear cupón"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
