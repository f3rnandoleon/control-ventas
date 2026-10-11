"use client";

import { useState } from "react";
import { PoliticasAjustes } from "@/types/ajustes";

interface PoliticasSettingsTabProps {
  politicas: PoliticasAjustes;
  onChange: (updated: PoliticasAjustes) => void;
}

type PoliticaKey = "devoluciones" | "privacidad" | "terminos" | "cookies";

export default function PoliticasSettingsTab({
  politicas,
  onChange,
}: PoliticasSettingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<PoliticaKey>("devoluciones");
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  const currentPolitica = politicas[activeSubTab];

  const handleUpdateCurrent = (field: string, value: unknown) => {
    onChange({
      ...politicas,
      [activeSubTab]: {
        ...politicas[activeSubTab],
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Barra de Sub-Pestañas de Políticas */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab("devoluciones")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === "devoluciones"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          🔄 Devoluciones y Cambios
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("privacidad")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === "privacidad"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          🔒 Política de Privacidad
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("terminos")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === "terminos"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          📜 Términos y Condiciones
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("cookies")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === "cookies"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          🍪 Política de Cookies
        </button>
      </div>

      {/* Editor de la Política Seleccionada */}
      <div className="surface-card rounded-2xl border border-sky-100 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {activeSubTab === "devoluciones" && "Políticas de Devolución y Cambios"}
              {activeSubTab === "privacidad" && "Política de Privacidad"}
              {activeSubTab === "terminos" && "Términos y Condiciones de Compra"}
              {activeSubTab === "cookies" && "Política y Banner de Cookies"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Este contenido se mostrará públicamente en la tienda web para tus clientes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span>{previewMode ? "✏️ Modo Editor" : "👁️ Vista Previa"}</span>
            </button>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={currentPolitica.activo ?? true}
                onChange={(e) => handleUpdateCurrent("activo", e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Activo en la web
            </label>
          </div>
        </div>

        {/* Parámetros Específicos por Tipo */}
        {activeSubTab === "devoluciones" && (
          <div className="rounded-xl bg-sky-50/70 p-4 border border-sky-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-sky-900 mb-1">
                Plazo máximo para devoluciones (Días)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={politicas.devoluciones.diasLimiteDevolucion ?? 7}
                onChange={(e) =>
                  handleUpdateCurrent(
                    "diasLimiteDevolucion",
                    parseInt(e.target.value) || 7
                  )
                }
                className="input w-full text-sm bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Ej: 7 días desde la fecha de recepción del pedido.
              </p>
            </div>
          </div>
        )}

        {activeSubTab === "cookies" && (
          <div className="rounded-xl bg-sky-50/70 p-4 border border-sky-100 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mostrarBannerCookies"
                checked={politicas.cookies.mostrarBanner ?? true}
                onChange={(e) => handleUpdateCurrent("mostrarBanner", e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <label
                htmlFor="mostrarBannerCookies"
                className="text-xs font-bold text-sky-900 cursor-pointer"
              >
                Mostrar Banner flotante de aviso de Cookies en la tienda web
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Texto breve del aviso en el banner
              </label>
              <input
                type="text"
                value={politicas.cookies.mensajeBanner || ""}
                onChange={(e) => handleUpdateCurrent("mensajeBanner", e.target.value)}
                className="input w-full text-sm bg-white"
                placeholder="Utilizamos cookies para garantizar la mejor experiencia..."
              />
            </div>
          </div>
        )}

        {/* Título de la Política */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Título público de la página
          </label>
          <input
            type="text"
            value={currentPolitica.titulo || ""}
            onChange={(e) => handleUpdateCurrent("titulo", e.target.value)}
            className="input w-full text-sm font-semibold text-slate-800"
            placeholder="Título que verán los clientes"
          />
        </div>

        {/* Área de Contenido Markdown / Vista Previa */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Contenido (Formato Markdown enriquecido)
            </label>
            <span className="text-[11px] text-slate-400">
              Usa `## Título`, `- Lista`, `**Negrita**`
            </span>
          </div>

          {previewMode ? (
            <div className="min-h-[280px] rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-sm text-slate-800 leading-relaxed space-y-3">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap font-sans">
                {currentPolitica.contenido}
              </div>
            </div>
          ) : (
            <textarea
              rows={12}
              value={currentPolitica.contenido || ""}
              onChange={(e) => handleUpdateCurrent("contenido", e.target.value)}
              className="input w-full font-mono text-sm leading-relaxed p-4"
              placeholder="Escribe el texto legal aquí utilizando Markdown..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
