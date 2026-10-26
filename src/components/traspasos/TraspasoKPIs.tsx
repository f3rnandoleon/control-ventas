"use client";

import type { Traspaso } from "@/types/traspaso";

interface TraspasoKPIsProps {
  traspasos: Traspaso[];
  filtroEstado: string;
  onSelectFiltro: (estado: string) => void;
}

export default function TraspasoKPIs({
  traspasos,
  filtroEstado,
  onSelectFiltro,
}: TraspasoKPIsProps) {
  const countTotal = traspasos.length;
  const countSolicitadas = traspasos.filter((t) => t.estado === "SOLICITADA").length;
  const countTransito = traspasos.filter((t) => t.estado === "EN_TRANSITO").length;
  const countRecibidas = traspasos.filter((t) => t.estado === "RECIBIDA").length;

  const totalPrendasEnTransito = traspasos
    .filter((t) => t.estado === "EN_TRANSITO")
    .reduce((acc, t) => acc + (t.totalPrendasEnviadas || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total */}
      <div
        onClick={() => onSelectFiltro("TODOS")}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md relative overflow-hidden group ${
          filtroEstado === "TODOS"
            ? "border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/30"
            : "border-white/10 bg-slate-900/40 hover:bg-slate-900/70 hover:border-white/20"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Movimientos
          </p>
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">{countTotal}</p>
        <p className="text-[11px] text-slate-400 mt-1 truncate">Histórico registrado</p>
      </div>

      {/* Solicitadas */}
      <div
        onClick={() => onSelectFiltro("SOLICITADA")}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md relative overflow-hidden group ${
          filtroEstado === "SOLICITADA"
            ? "border-amber-500/50 bg-amber-500/15 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30"
            : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Solicitadas
          </p>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-2 tracking-tight">{countSolicitadas}</p>
        <p className="text-[11px] text-amber-400/80 mt-1 truncate">Pendientes por despachar</p>
      </div>

      {/* En Tránsito */}
      <div
        onClick={() => onSelectFiltro("EN_TRANSITO")}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md relative overflow-hidden group ${
          filtroEstado === "EN_TRANSITO"
            ? "border-cyan-500/60 bg-cyan-500/15 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40"
            : "border-cyan-500/25 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/35"
        }`}
      >
        {countTransito > 0 && (
          <div className="absolute top-3 right-3 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            En Tránsito
          </p>
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 9h11v8H3V9zm11 3h4l3 3v2h-7v-5z" />
            </svg>
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-black text-cyan-300 mt-2 tracking-tight">{countTransito}</p>
        <p className="text-[11px] text-cyan-400/80 mt-1 truncate">
          {totalPrendasEnTransito} prendas viajando
        </p>
      </div>

      {/* Recibidas */}
      <div
        onClick={() => onSelectFiltro("RECIBIDA")}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md relative overflow-hidden group ${
          filtroEstado === "RECIBIDA"
            ? "border-emerald-500/50 bg-emerald-500/15 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30"
            : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/30"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Recibidas
          </p>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-black text-emerald-300 mt-2 tracking-tight">{countRecibidas}</p>
        <p className="text-[11px] text-emerald-400/80 mt-1 truncate">Completadas con éxito</p>
      </div>
    </div>
  );
}
