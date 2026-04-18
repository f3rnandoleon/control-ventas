"use client";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps) {
  return (
    <div className="rounded-3xl border border-red-200 bg-white/90 p-8 text-slate-900 shadow-[0_18px_40px_rgba(239,68,68,0.08)]">
      <p className="text-sm uppercase tracking-[0.3em] text-red-600">
        Error en dashboard
      </p>
      <h1 className="mt-3 text-3xl font-bold">No se pudo cargar esta seccion</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        {error.message || "Ocurrio un error inesperado al cargar el panel."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        Reintentar
      </button>
    </div>
  );
}
