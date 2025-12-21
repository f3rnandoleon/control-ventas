"use client";

import { Venta } from "@/types/venta";

export default function VentasPropiasRecientes({
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
        Mis ventas recientes
      </h2>

      <table className="w-full text-sm text-gray-300">
        <thead className="text-gray-400 border-b border-white/10">
          <tr>
            <th className="py-2">Fecha</th>
            <th>N°</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((v) => (
            <tr key={v._id} className="border-b border-white/5">
              <td className="py-2">
                {new Date(v.createdAt).toLocaleString()}
              </td>
              <td>{v.numeroVenta}</td>
              <td className="text-cyan-400 font-semibold">
                Bs {v.total}
              </td>
            </tr>
          ))}

          {ventas.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-gray-400">
                Aún no tienes ventas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
