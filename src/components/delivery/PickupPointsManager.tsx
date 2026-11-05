"use client";

import { useState } from "react";
import { PickupPoint } from "@/types/delivery";
import { slugify } from "@/utils/slugify";
import MapPreviewModal from "./MapPreviewModal";

interface Props {
  points: PickupPoint[];
  onChange: (points: PickupPoint[]) => void;
}

export default function PickupPointsManager({ points, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newMapsUrl, setNewMapsUrl] = useState("");
  const [previewPoint, setPreviewPoint] = useState<PickupPoint | null>(null);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [editUrlValue, setEditUrlValue] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newPoint: PickupPoint = {
      id: slugify(newName),
      name: newName.trim(),
      costoBOB: 0,
      costoEstimadoBOB: 0,
      googleMapsUrl: newMapsUrl.trim() || undefined,
    };
    onChange([...points, newPoint]);
    setNewName("");
    setNewMapsUrl("");
  };

  const handleRemove = (id: string) => {
    onChange(points.filter((p) => p.id !== id));
  };

  const startEditUrl = (point: PickupPoint) => {
    setEditingPointId(point.id);
    setEditUrlValue(point.googleMapsUrl || "");
  };

  const saveEditUrl = (id: string) => {
    const updated = points.map((p) =>
      p.id === id ? { ...p, googleMapsUrl: editUrlValue.trim() || undefined } : p
    );
    onChange(updated);
    setEditingPointId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-white">Puntos de Encuentro (La Paz)</h2>
        <p className="text-sm text-gray-400">
          Lugares físicos estratégicos donde los clientes recogen sus pedidos sin costo de envío adicional (Costo: Bs. 0.00).
        </p>
      </div>

      {/* Formulario para agregar punto */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del punto (ej: Teleférico Morado - Faro Murillo)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/50 outline-none transition-all"
        />
        <input
          type="url"
          value={newMapsUrl}
          onChange={(e) => setNewMapsUrl(e.target.value)}
          placeholder="Link de Google Maps (opcional)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/50 outline-none transition-all"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 whitespace-nowrap"
        >
          + Agregar Punto
        </button>
      </div>

      {/* Lista de puntos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {points.map((point) => (
          <div
            key={point.id}
            className="group flex flex-col justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300 gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{point.name}</span>
                <span className="text-[10px] text-gray-500 font-mono tracking-tighter">{point.id}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                Bs. 0.00
              </span>
            </div>

            {/* Input de edición inline de mapa o visualización de mapa */}
            {editingPointId === point.id ? (
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <input
                  type="url"
                  value={editUrlValue}
                  onChange={(e) => setEditUrlValue(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="flex-1 bg-black/40 border border-cyan-500/40 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                  autoFocus
                />
                <button
                  onClick={() => saveEditUrl(point.id)}
                  className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-lg font-bold"
                >
                  OK
                </button>
                <button
                  onClick={() => setEditingPointId(null)}
                  className="px-2 py-1 bg-white/10 text-gray-400 text-xs rounded-lg"
                >
                  X
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                {point.googleMapsUrl ? (
                  <button
                    onClick={() => setPreviewPoint(point)}
                    className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Ver mapa</span>
                  </button>
                ) : (
                  <span className="text-gray-500 text-[11px] italic">Sin mapa</span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditUrl(point)}
                    title={point.googleMapsUrl ? "Cambiar enlace de mapa" : "Añadir enlace de mapa"}
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemove(point.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                    title="Eliminar punto"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {points.length === 0 && (
        <div className="py-12 text-center text-gray-500 text-sm italic">
          No hay puntos de encuentro registrados.
        </div>
      )}

      {/* Modal de previsualización de mapa */}
      {previewPoint && previewPoint.googleMapsUrl && (
        <MapPreviewModal
          title={previewPoint.name}
          subtitle="Punto de Encuentro en La Paz (Gratuito)"
          url={previewPoint.googleMapsUrl}
          onClose={() => setPreviewPoint(null)}
        />
      )}
    </div>
  );
}
