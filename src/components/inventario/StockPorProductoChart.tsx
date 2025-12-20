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

interface ProductoStock {
  nombre: string;
  stockTotal: number;
  stockMinimo: number;
}

export default function StockPorProductoChart({
  data,
}: {
  data: ProductoStock[];
}) {
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-6
      shadow-[0_0_20px_rgba(0,180,255,0.15)]"
    >
      <h2 className="text-lg font-semibold text-cyan-400 mb-4">
        Stock por producto
      </h2>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="nombre"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #ffffff20",
                color: "#fff",
              }}
            />
            <Bar
              dataKey="stockTotal"
              fill="#22d3ee"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
