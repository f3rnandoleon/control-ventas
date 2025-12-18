"use client";

import { InventarioItem } from "@/types/inventario";

export default function InventarioTable({
  items,
  loading,
}: {
  items: InventarioItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="text-gray-400">Cargando inventario...</p>
    );
  }

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl
      shadow-[0_0_20px_rgba(0,180,255,0.15)] overflow-x-auto"
    >
      <table className="w-full text-sm text-gray-300">
        <thead className="text-gray-400 border-b border-white/10">
          <tr>
            <th className="px-6 py-4">Fecha</th>
            <th>Producto</th>
            <th>Variante</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Stock</th>
            <th>Usuario</th>
          </tr>
        </thead>

        <tbody>
          {items.map((i) => (
            <tr
              key={i._id}
              className="border-b border-white/5 hover:bg-white/5"
            >
              <td className="px-6 py-3">
                {new Date(i.createdAt).toLocaleString()}
              </td>
              <td>{i.productoId.nombre}</td>
              <td>
                {i.variante.color} / {i.variante.talla}
              </td>
              <td>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold
                  ${
                    i.tipo === "ENTRADA"
                      ? "bg-green-500/20 text-green-400"
                      : i.tipo === "SALIDA"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {i.tipo}
                </span>
              </td>
              <td>{i.cantidad}</td>
              <td>
                {i.stockAnterior} →{" "}
                <span className="text-cyan-400">
                  {i.stockActual}
                </span>
              </td>
              <td>{i.usuario?.fullname || "-"}</td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-gray-400">
                No hay movimientos de inventario
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
