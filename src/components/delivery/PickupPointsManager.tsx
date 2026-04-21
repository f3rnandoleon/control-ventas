"use client";

import { useState } from "react";
import { PickupPoint } from "@/types/delivery";
import { slugify } from "@/utils/slugify";

interface Props {
  points: PickupPoint[];
  onChange: (points: PickupPoint[]) => void;
}

export default function PickupPointsManager({ points, onChange }: Props) {
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newPoint: PickupPoint = {
      id: slugify(newName),
      name: newName.trim(),
    };
    onChange([...points, newPoint]);
    setNewName("");
  };

  const handleRemove = (id: string) => {
    onChange(points.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-white">Puntos de Encuentro</h2>
        <p className="text-sm text-gray-400">Lugares físicos donde los clientes pueden recoger sus pedidos.</p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del punto (ej: Teleférico Morado - Faro Murillo)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/50 outline-none transition-all"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20"
        >
          + Agregar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {points.map((point) => (
          <div 
            key={point.id}
            className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{point.name}</span>
              <span className="text-[10px] text-gray-500 font-mono tracking-tighter">{point.id}</span>
            </div>
            <button
              onClick={() => handleRemove(point.id)}
              className="p-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              title="Eliminar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {points.length === 0 && (
        <div className="py-12 text-center text-gray-500 text-sm italic">
          No hay puntos de encuentro registrados.
        </div>
      )}
    </div>
  );
}
