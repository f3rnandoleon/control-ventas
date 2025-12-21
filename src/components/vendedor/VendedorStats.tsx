"use client";

export default function VendedorStats({
  ventasHoy,
  totalHoy,
}: {
  ventasHoy: number;
  totalHoy: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Ventas de hoy" value={ventasHoy} />
      <Card title="Total vendido hoy" value={`Bs ${totalHoy}`} />
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
