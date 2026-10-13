"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AlertaItem {
  id: string;
  tipo: "PEDIDO" | "STOCK" | "TRASPASO" | "CAJA";
  titulo: string;
  descripcion: string;
  href: string;
  urgente: boolean;
}

interface NotificacionesResumen {
  totalAlertas: number;
  kpis: {
    pedidosPendientesPago: number;
    pedidosPorEntregar: number;
    traspasosEnTransito: number;
    traspasosSolicitados: number;
    stockBajoCount: number;
    sesionesCajaAbiertas: number;
  };
  items: AlertaItem[];
}

export default function NotificationBell() {
  const [data, setData] = useState<NotificacionesResumen | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchResumen = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notificaciones/resumen");
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
      // Ignorar fallos silenciosos de polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchResumen();
    const interval = setInterval(() => {
      void fetchResumen();
    }, 60000); // Cada 60 segundos
    return () => clearInterval(interval);
  }, []);

  // Manejar click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const count = data?.totalAlertas ?? 0;
  const hasUrgent = data?.items?.some((i) => i.urgente);

  const getIconForType = (tipo: string) => {
    switch (tipo) {
      case "PEDIDO":
        return "🛒";
      case "TRASPASO":
        return "🚚";
      case "STOCK":
        return "⚠️";
      case "CAJA":
        return "💵";
      default:
        return "🔔";
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-white shadow-sm hover:bg-sky-50 transition text-slate-700"
        aria-label="Notificaciones del sistema"
      >
        <span className="text-lg">🔔</span>
        {count > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ${
              hasUrgent ? "bg-red-500 animate-pulse" : "bg-amber-500"
            }`}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-sky-100 bg-white/95 p-4 shadow-[0_20px_50px_rgba(14,116,144,0.18)] backdrop-blur-xl z-50 animate-fade-in text-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-sky-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Notificaciones y Alertas</span>
              {count > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                  {count} acción(es)
                </span>
              )}
            </div>
            <button
              onClick={() => void fetchResumen()}
              disabled={loading}
              className="text-xs text-sky-600 hover:text-sky-800 transition font-medium"
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {/* Quick summary badges */}
          {data?.kpis && (
            <div className="grid grid-cols-3 gap-2 my-3 text-center">
              <div className="rounded-lg bg-sky-50 p-2 border border-sky-100">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Pedidos</span>
                <span className="text-sm font-bold text-sky-800">
                  {data.kpis.pedidosPendientesPago + data.kpis.pedidosPorEntregar}
                </span>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 border border-amber-100">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Traspasos</span>
                <span className="text-sm font-bold text-amber-800">
                  {data.kpis.traspasosEnTransito}
                </span>
              </div>
              <div className="rounded-lg bg-red-50 p-2 border border-red-100">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Stock Bajo</span>
                <span className="text-sm font-bold text-red-700">
                  {data.kpis.stockBajoCount}
                </span>
              </div>
            </div>
          )}

          {/* Lista de alertas */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {!data?.items || data.items.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                <span className="text-2xl block mb-1">🎉</span>
                ¡Todo al día! No hay alertas pendientes.
              </div>
            ) : (
              data.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                  className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-sky-50/80 cursor-pointer border border-transparent hover:border-sky-100"
                >
                  <span className="text-xl mt-0.5">{getIconForType(item.tipo)}</span>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-slate-900 leading-tight">
                        {item.titulo}
                      </p>
                      {item.urgente && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600 uppercase shrink-0">
                          Urgente
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-slate-500 leading-normal">
                      {item.descripcion}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pie */}
          <div className="mt-3 pt-3 border-t border-sky-100 flex justify-between items-center text-xs">
            <Link
              href="/dashboard/admin/pedidos"
              onClick={() => setOpen(false)}
              className="text-sky-700 font-medium hover:underline"
            >
              Ver todos los pedidos →
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
