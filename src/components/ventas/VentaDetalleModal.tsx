"use client";

import { Venta } from "@/types/venta";

export default function VentaDetalleModal({
  venta,
  onClose,
}: {
  venta: Venta | null;
  onClose: () => void;
}) {
  if (!venta) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div
        className="w-full max-w-2xl rounded-2xl bg-white/10 backdrop-blur-xl
        border border-white/20 p-6 shadow-[0_0_40px_rgba(0,180,255,0.35)]"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-cyan-400">
            Detalle de Venta
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            ✕
          </button>
        </div>

        {/* Info general */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-6">
          <p><strong>N° Venta:</strong> {venta.numeroVenta}</p>
          <p><strong>Fecha:</strong> {new Date(venta.createdAt).toLocaleString()}</p>
          <p><strong>Vendedor:</strong> {venta.vendedor?.fullname || "-"}</p>
          <p><strong>Método:</strong> {venta.metodoPago}</p>
        </div>

        {/* Items */}
        <table className="w-full text-sm text-gray-300 mb-4">
          <thead className="text-gray-400 border-b border-white/10">
            <tr>
              <th className="py-2">Producto</th>
              <th>Variante</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((item, idx) => (
              <tr key={idx} className="border-b border-white/5">
                <td className="py-2">
                  {typeof item.productoId === "string"
                    ? "Producto"
                    : item.productoId.nombre}
                </td>
                <td>
                  {item.variante.color} / {item.variante.talla}
                </td>
                <td>{item.cantidad}</td>
                <td>Bs {item.precioUnitario}</td>
                <td>
                  Bs {(item.precioUnitario * item.cantidad).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="text-right space-y-1">
          <p className="text-gray-400">
            Subtotal: Bs {venta.subtotal}
          </p>
          <p className="text-gray-400">
            Descuento: Bs {venta.descuento}
          </p>
          <p className="text-xl font-bold text-cyan-400">
            Total: Bs {venta.total}
          </p>
        </div>
      </div>
    </div>
  );
}
