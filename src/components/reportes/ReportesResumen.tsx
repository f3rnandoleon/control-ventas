"use client";

export default function ReportesResumen({
  totalVentas,
  gananciaTotal,
  cantidadVentas,
}: {
  totalVentas: number;
  gananciaTotal: number;
  cantidadVentas: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card title="Total vendido" value={`Bs ${totalVentas}`} />
      <Card title="Ganancia total" value={`Bs ${gananciaTotal}`} />
      <Card title="Cantidad de ventas" value={cantidadVentas} />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
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
