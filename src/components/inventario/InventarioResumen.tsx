"use client";

import { InventarioItem } from "@/types/inventario";

export default function InventarioResumen({
  items,
}: {
  items: InventarioItem[];
}) {
  const entradas = items.filter(i => i.tipo === "ENTRADA").length;
  const salidas = items.filter(i => i.tipo === "SALIDA").length;
  const ajustes = items.filter(i => i.tipo === "AJUSTE").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card title="Entradas" value={entradas} />
      <Card title="Salidas" value={salidas} />
      <Card title="Ajustes" value={ajustes} />
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
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
