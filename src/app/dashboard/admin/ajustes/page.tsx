"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getAjustesAdmin, updateAjustesAdmin } from "@/services/ajustes.service";
import { AjustesSistemaDTO, FinanzasAjustes, PoliticasAjustes } from "@/types/ajustes";
import FinanzasSettingsTab from "@/components/ajustes/FinanzasSettingsTab";
import PoliticasSettingsTab from "@/components/ajustes/PoliticasSettingsTab";

export default function AdminAjustesPage() {
  const [ajustes, setAjustes] = useState<AjustesSistemaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"FINANZAS" | "POLITICAS">("FINANZAS");

  const loadAjustes = async () => {
    try {
      setLoading(true);
      const data = await getAjustesAdmin();
      setAjustes(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar ajustes del sistema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAjustes();
  }, []);

  const handleFinanzasChange = (updated: FinanzasAjustes) => {
    if (!ajustes) return;
    setAjustes({
      ...ajustes,
      finanzas: updated,
    });
  };

  const handlePoliticasChange = (updated: PoliticasAjustes) => {
    if (!ajustes) return;
    setAjustes({
      ...ajustes,
      politicas: updated,
    });
  };

  const handleSave = async () => {
    if (!ajustes) return;

    try {
      setSaving(true);
      const updated = await updateAjustesAdmin({
        finanzas: {
          tipoCambioPEN_BOB: Number(ajustes.finanzas.tipoCambioPEN_BOB),
        },
        politicas: ajustes.politicas,
      });

      setAjustes(updated);
      toast.success("Ajustes guardados correctamente");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al guardar ajustes";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (!ajustes) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Encabezado con Botón de Guardar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Ajustes del <span className="text-sky-600">Sistema</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra el tipo de cambio oficial para compras en Soles, políticas web de la tienda y preferencias generales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary min-w-[160px] justify-center flex items-center gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <span>💾</span> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </header>

      {/* Selector de Pestañas Maestras */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        <nav className="flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab("FINANZAS")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "FINANZAS"
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>💱</span> Finanzas y Moneda
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("POLITICAS")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "POLITICAS"
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>⚖️</span> Políticas Web
          </button>
        </nav>

        {/* Acceso Rápido a Delivery */}
        <Link
          href="/dashboard/admin/delivery"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition"
        >
          <span>🚚</span> Ir a Opciones de Entrega ➔
        </Link>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {activeTab === "FINANZAS" && (
        <FinanzasSettingsTab
          finanzas={ajustes.finanzas}
          onChange={handleFinanzasChange}
        />
      )}

      {activeTab === "POLITICAS" && (
        <PoliticasSettingsTab
          politicas={ajustes.politicas}
          onChange={handlePoliticasChange}
        />
      )}
    </div>
  );
}
