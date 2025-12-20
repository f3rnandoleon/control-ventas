"use client";

import { Venta } from "@/types/venta";

export default function VentasRecientes({
  ventas,
}: {
  ventas: Venta[];
}) {
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-6
      shadow-[0_0_20px_rgba(0,180,255,0.15)]"
    >
      <h2 className="text-lg font-semibold text-cyan-400 mb-4">
        Ventas recientes
      </h2>

      <ul className="space-y-3 text-sm text-gray-300">
        {ventas.map((v) => (
          <li
            key={v._id}
            className="flex justify-between border-b border-white/5 pb-2"
          >
            <span>{v.numeroVenta}</span>
            <span className="text-cyan-400 font-semibold">
              Bs {v.total}
            </span>
          </li>
        ))}

        {ventas.length === 0 && (
          <p className="text-gray-400">
            No hay ventas recientes
          </p>
        )}
      </ul>
    </div>
  );
}
