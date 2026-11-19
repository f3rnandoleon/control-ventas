"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ICupon, IPromocion } from "@/types/promocion";
import {
  createAdminCuponClient,
  createAdminPromocionClient,
  deleteAdminCuponClient,
  deleteAdminPromocionClient,
  getAdminCupones,
  getAdminPromociones,
  toggleAdminPromocionClient,
  updateAdminCuponClient,
  updateAdminPromocionClient,
} from "@/services/promociones.service";
import PromocionFormModal from "@/components/promociones/PromocionFormModal";
import CuponFormModal from "@/components/promociones/CuponFormModal";

function formatBenefitLabel(promo: IPromocion): string {
  if (promo.tipo === "PORCENTAJE") {
    return `${promo.valor}% OFF${promo.descuentoMaximo ? ` (máx Bs ${promo.descuentoMaximo})` : ""}`;
  }
  if (promo.tipo === "MONTO_FIJO") {
    return `Bs ${promo.valor.toFixed(2)} OFF`;
  }
  if (promo.tipo === "NXM" && promo.reglaNxM) {
    return `${promo.reglaNxM.lleva}x${promo.reglaNxM.paga}`;
  }
  if (promo.tipo === "SEGUNDA_UNIDAD") {
    return `2da unidad al ${promo.valor}%`;
  }
  return "Envío gratis";
}

export default function AdminPromocionesPage() {
  const [tab, setTab] = useState<"PROMOCIONES" | "CUPONES">("PROMOCIONES");
  const [promociones, setPromociones] = useState<IPromocion[]>([]);
  const [cupones, setCupones] = useState<ICupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<IPromocion | null>(null);

  const [cuponModalOpen, setCuponModalOpen] = useState(false);
  const [editingCupon, setEditingCupon] = useState<ICupon | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [promosData, cuponesData] = await Promise.all([
        getAdminPromociones(),
        getAdminCupones(),
      ]);
      setPromociones(promosData);
      setCupones(cuponesData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar promociones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSavePromo = async (payload: Record<string, unknown>) => {
    if (editingPromo?._id) {
      await updateAdminPromocionClient(editingPromo._id, payload);
      toast.success("Promoción actualizada");
    } else {
      await createAdminPromocionClient(payload);
      toast.success("Promoción creada");
    }
    setPromoModalOpen(false);
    setEditingPromo(null);
    await loadAll();
  };

  const handleTogglePromo = async (promo: IPromocion) => {
    try {
      const res = await toggleAdminPromocionClient(promo._id);
      toast.success(res.message);
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar estado");
    }
  };

  const handleDeletePromo = async (promo: IPromocion) => {
    if (!window.confirm(`¿Eliminar la promoción "${promo.nombre}"?`)) return;
    try {
      await deleteAdminPromocionClient(promo._id);
      toast.success("Promoción eliminada");
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const handleSaveCupon = async (payload: Record<string, unknown>) => {
    if (editingCupon?._id) {
      await updateAdminCuponClient(editingCupon._id, payload);
      toast.success("Cupón actualizado");
    } else {
      await createAdminCuponClient(payload);
      toast.success("Cupón creado");
    }
    setCuponModalOpen(false);
    setEditingCupon(null);
    await loadAll();
  };

  const handleToggleCupon = async (cupon: ICupon) => {
    try {
      await updateAdminCuponClient(cupon._id, { activo: !cupon.activo });
      toast.success(cupon.activo ? "Cupón desactivado" : "Cupón activado");
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar cupón");
    }
  };

  const handleDeleteCupon = async (cupon: ICupon) => {
    if (!window.confirm(`¿Eliminar el cupón "${cupon.codigo}"?`)) return;
    try {
      await deleteAdminCuponClient(cupon._id);
      toast.success("Cupón eliminado");
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar cupón");
    }
  };

  const activePromosCount = promociones.filter((p) => p.estado === "ACTIVA").length;
  const activeCuponesCount = cupones.filter((c) => c.activo).length;
  const totalUsos = promociones.reduce((acc, p) => acc + (p.usosActuales || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Promociones y Cupones <span className="text-sky-600 dark:text-cyan-400">Web</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administra campañas automáticas (2x1, 3x2, % OFF) y códigos de cupón exclusivos para el storefront web. Las ventas en POS físico permanecen intactas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingPromo(null);
              setPromoModalOpen(true);
            }}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            + Nueva Promoción
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingCupon(null);
              setCuponModalOpen(true);
            }}
            className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100 dark:border-cyan-500/30 dark:bg-cyan-950/30 dark:text-cyan-300"
          >
            + Nuevo Cupón
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-card rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Promociones Activas</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {activePromosCount}{" "}
            <span className="text-sm font-normal text-slate-400">/ {promociones.length}</span>
          </p>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Cupones Activos</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {activeCuponesCount}{" "}
            <span className="text-sm font-normal text-slate-400">/ {cupones.length}</span>
          </p>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Redenciones Registradas</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalUsos}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setTab("PROMOCIONES")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            tab === "PROMOCIONES"
              ? "bg-sky-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          }`}
        >
          Promociones ({promociones.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("CUPONES")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            tab === "CUPONES"
              ? "bg-sky-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          }`}
        >
          Cupones ({cupones.length})
        </button>
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-8 text-center text-sm text-slate-500">
          Cargando configuración promocional...
        </div>
      ) : tab === "PROMOCIONES" ? (
        <div className="space-y-3">
          {promociones.length === 0 ? (
            <div className="surface-card rounded-2xl p-8 text-center text-sm text-slate-500">
              Aún no creaste promociones web. Crea tu primera campaña con &quot;+ Nueva Promoción&quot;.
            </div>
          ) : (
            promociones.map((promo) => (
              <div
                key={promo._id}
                className="surface-card rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {promo.nombre}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        promo.estado === "ACTIVA"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {promo.estado}
                    </span>
                    <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-cyan-300">
                      {promo.metodoActivacion === "CUPON" ? "CUPÓN" : "AUTOMÁTICA"}
                    </span>
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      {formatBenefitLabel(promo)}
                    </span>
                  </div>
                  {promo.descripcion && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {promo.descripcion}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Alcance: {promo.alcance}</span>
                    <span>Prioridad: {promo.prioridad}</span>
                    <span>
                      Usos: {promo.usosActuales}
                      {promo.usoMaximoTotal ? ` / ${promo.usoMaximoTotal}` : ""}
                    </span>
                    <span>
                      Rebajas catálogo:{" "}
                      {promo.acumulableConRebajasCatalogo ? "Sí acumula" : "No acumula"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePromo(promo)}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    {promo.estado === "ACTIVA" ? "Pausar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPromo(promo);
                      setPromoModalOpen(true);
                    }}
                    className="rounded-xl border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-cyan-500/30 dark:text-cyan-300"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePromo(promo)}
                    className="rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cupones.length === 0 ? (
            <div className="surface-card rounded-2xl p-8 text-center text-sm text-slate-500">
              No hay cupones registrados todavía.
            </div>
          ) : (
            cupones.map((cupon) => {
              const promoInfo =
                typeof cupon.promocionId === "object" && cupon.promocionId
                  ? cupon.promocionId
                  : null;
              return (
                <div
                  key={cupon._id}
                  className="surface-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold tracking-wider text-slate-900 dark:text-white">
                        {cupon.codigo}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          cupon.activo
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {cupon.activo ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Promoción: <strong>{promoInfo?.nombre || "—"}</strong> · Usos:{" "}
                      {cupon.usosActuales}
                      {cupon.usoMaximoTotal ? ` / ${cupon.usoMaximoTotal}` : ""}
                      {cupon.usoMaximoPorCliente
                        ? ` · Máx ${cupon.usoMaximoPorCliente}/cliente`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleCupon(cupon)}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {cupon.activo ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCupon(cupon);
                        setCuponModalOpen(true);
                      }}
                      className="rounded-xl border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-cyan-500/30 dark:text-cyan-300"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCupon(cupon)}
                      className="rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <PromocionFormModal
        isOpen={promoModalOpen}
        onClose={() => {
          setPromoModalOpen(false);
          setEditingPromo(null);
        }}
        onSave={handleSavePromo}
        editing={editingPromo}
      />

      <CuponFormModal
        isOpen={cuponModalOpen}
        onClose={() => {
          setCuponModalOpen(false);
          setEditingCupon(null);
        }}
        onSave={handleSaveCupon}
        promociones={promociones}
        editing={editingCupon}
      />
    </div>
  );
}
