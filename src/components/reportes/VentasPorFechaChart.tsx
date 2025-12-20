"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function VentasPorFechaChart({
  data,
}: {
  data: { fecha: string; total: number }[];
}) {
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-6
      shadow-[0_0_20px_rgba(0,180,255,0.15)]"
    >
      <h2 className="text-lg font-semibold text-cyan-400 mb-4">
        Ventas por fecha
      </h2>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="fecha" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #ffffff20",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#22d3ee"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
