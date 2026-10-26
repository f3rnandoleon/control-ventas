"use client";

import type { EstadoTraspaso } from "@/types/traspaso";

interface TraspasoStatusBadgeProps {
  estado: EstadoTraspaso | string;
  size?: "sm" | "md";
  className?: string;
}

export default function TraspasoStatusBadge({
  estado,
  size = "sm",
  className = "",
}: TraspasoStatusBadgeProps) {
  const isMd = size === "md";
  const sizeClasses = isMd ? "px-3 py-1.5 text-xs gap-1.5 font-semibold" : "px-2.5 py-1 text-[11px] gap-1 font-medium";

  switch (estado) {
    case "SOLICITADA":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-950/20 ${sizeClasses} ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Solicitada</span>
        </span>
      );

    case "EN_TRANSITO":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/20 ${sizeClasses} ${className}`}
        >
          <span className="relative flex h-2 w-2 mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM3 9h11v8H3V9zm11 3h4l3 3v2h-7v-5z" />
          </svg>
          <span>En Tránsito</span>
        </span>
      );

    case "RECIBIDA":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/20 ${sizeClasses} ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Recibida</span>
        </span>
      );

    case "CANCELADA":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-950/20 ${sizeClasses} ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Cancelada</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-gray-500/15 text-gray-300 border border-gray-500/30 ${sizeClasses} ${className}`}
        >
          {estado}
        </span>
      );
  }
}
