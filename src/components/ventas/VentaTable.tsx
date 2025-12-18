"use client";

import { Venta } from "@/types/venta";

export default function VentaTable({
  ventas,
  onVerDetalle,
}: {
  ventas: Venta[];
  onVerDetalle: (venta: Venta) => void;
}) {
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl
      shadow-[0_0_20px_rgba(0,180,255,0.15)] overflow-x-auto"
    >
      <table className="w-full text-sm text-gray-300">
        <thead className="text-gray-400 border-b border-white/10">
          <tr>
            <th className="px-6 py-4">Fecha</th>
            <th>N° Venta</th>
            <th>Vendedor</th>
            <th>Total</th>
            <th>Método</th>
            <th className="text-right px-6">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {ventas.map((v) => (
            <tr
              key={v._id}
              className="border-b border-white/5 hover:bg-white/5 transition"
            >
              <td className="px-6 py-4">
                {new Date(v.createdAt).toLocaleString()}
              </td>
              <td>{v.numeroVenta}</td>
              <td>{v.vendedor?.fullname}</td>
              <td className="text-cyan-400 font-semibold">
                Bs {v.total}
              </td>
              <td>{v.metodoPago}</td>
              <td className="px-6 text-right">
                <button
                  className="btn-link"
                  onClick={() => onVerDetalle(v)}
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}

          {ventas.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-400">
                No hay ventas registradas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
