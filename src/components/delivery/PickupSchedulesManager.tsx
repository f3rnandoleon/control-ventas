"use client";

import { useState } from "react";
import { PickupSchedule } from "@/types/delivery";
import { slugify } from "@/utils/slugify";

interface Props {
  schedules: PickupSchedule[];
  onChange: (schedules: PickupSchedule[]) => void;
}

const DAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

export default function PickupSchedulesManager({ schedules, onChange }: Props) {
  const [day, setDay] = useState("Lunes");
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("18:00");

  const handleAdd = () => {
    const label = `${day}: ${start}-${end}`;
    const id = slugify(label);
    
    if (schedules.some(s => s.id === id)) return;

    const newSchedule: PickupSchedule = {
      id,
      day,
      start,
      end,
      label
    };
    onChange([...schedules, newSchedule]);
  };

  const handleRemove = (id: string) => {
    onChange(schedules.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Horarios de Entrega</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400">Define en qué rangos de horas se realizan las entregas.</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-widest ml-1">Día</label>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500/50 outline-none shadow-sm"
          >
            {DAYS.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-32">
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-widest ml-1">Inicio</label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500/50 outline-none shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5 w-32">
          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-widest ml-1">Fin</label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500/50 outline-none shadow-sm"
          />
        </div>

        <button
          onClick={handleAdd}
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95"
        >
          + Agregar Horario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {schedules.map((schedule) => (
          <div 
            key={schedule.id}
            className="group flex flex-col p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 relative shadow-sm"
          >
            <span className="text-xs uppercase font-bold text-cyan-700 dark:text-cyan-400 mb-1">{schedule.day}</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{schedule.start} - {schedule.end}</span>
            
            <button
              onClick={() => handleRemove(schedule.id)}
              aria-label="Eliminar horario"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {schedules.length === 0 && (
        <div className="py-12 text-center text-slate-400 dark:text-gray-500 text-sm italic">
          No hay horarios registrados.
        </div>
      )}
    </div>
  );
}
