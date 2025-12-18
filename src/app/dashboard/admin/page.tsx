"use client";

export default function AdminDashboard() {
    
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Ventas Totales" value="Bs 0" />
        <Card title="Ganancia" value="Bs 0" />
        <Card title="Ventas Hoy" value="0" />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 
      shadow-[0_0_20px_rgba(0,180,255,0.15)]">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-2xl font-bold text-cyan-400 mt-2">
        {value}
      </p>
    </div>
  );
}
