"use client";

export default function DashboardStats({
  ventasHoy,
  ventasMes,
  gananciaMes,
}: {
  ventasHoy: number;
  ventasMes: number;
  gananciaMes: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Stat title="Ventas hoy" value={`Bs ${ventasHoy}`} />
      <Stat title="Ventas del mes" value={`Bs ${ventasMes}`} />
      <Stat title="Ganancia del mes" value={`Bs ${gananciaMes}`} />
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
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
