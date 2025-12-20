"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ComparativaMensualChart({
  actual,
  anterior,
}: {
  actual: number;
  anterior: number;
}) {
  const data = [
    { mes: "Mes anterior", total: anterior },
    { mes: "Mes actual", total: actual },
  ];

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-6
      shadow-[0_0_20px_rgba(0,180,255,0.15)]"
    >
      <h2 className="text-lg font-semibold text-cyan-400 mb-4">
        Comparativa mensual
      </h2>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="mes" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="total" fill="#22d3ee" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
