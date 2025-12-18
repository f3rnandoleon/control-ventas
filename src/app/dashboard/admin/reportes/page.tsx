"use client";

import SectionCard from "@/components/dashboard/SectionCard";

export default function AdminReportesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reportes</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Metric title="Total ventas" value="Bs 0" />
        <Metric title="Ganancia total" value="Bs 0" />
        <Metric title="Cantidad de ventas" value="0" />
      </div>

      <SectionCard title="Reportes disponibles">
        <ul className="space-y-3 text-gray-300">
          <li className="flex justify-between items-center border-b border-white/5 pb-2">
            <span>Ventas diarias</span>
            <button className="text-cyan-400 hover:underline">
              Ver
            </button>
          </li>
          <li className="flex justify-between items-center border-b border-white/5 pb-2">
            <span>Ventas mensuales</span>
            <button className="text-cyan-400 hover:underline">
              Ver
            </button>
          </li>
          <li className="flex justify-between items-center">
            <span>Productos más vendidos</span>
            <button className="text-cyan-400 hover:underline">
              Ver
            </button>
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-xl p-6
      shadow-[0_0_15px_rgba(0,180,255,0.15)]"
    >
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-2xl font-bold text-cyan-400 mt-2">
        {value}
      </p>
    </div>
  );
}
