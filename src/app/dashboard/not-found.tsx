import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="surface-card-strong rounded-3xl p-8 text-slate-900">
      <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
        Ruta no encontrada
      </p>
      <h1 className="mt-3 text-3xl font-bold">
        Esta seccion del dashboard no existe
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        Revisa la navegacion lateral o vuelve a uno de los paneles principales.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/admin" className="btn-primary">
          Ir a dashboard admin
        </Link>
        <Link href="/dashboard/vendedor" className="btn-secondary">
          Ir a dashboard vendedor
        </Link>
      </div>
    </div>
  );
}
