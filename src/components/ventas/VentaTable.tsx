"use client";
import type { Pedido } from "@/types/pedido";
import Pagination from "@/components/ui/Pagination";

export default function VentaTable({ ventas, onVerDetalle, currentPage, totalPages, pageSize, totalItems, loading, onPageChange, onPageSizeChange }: {
  ventas: Pedido[]; onVerDetalle: (pedido: Pedido) => void; currentPage: number; totalPages: number;
  pageSize: number; totalItems: number; loading: boolean; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_20px_rgba(0,180,255,0.15)]">
    <div className="overflow-x-auto"><table className="w-full text-sm text-gray-300">
      <thead className="border-b border-white/10 text-gray-400"><tr>
        <th className="px-6 py-4">Fecha</th><th>N° Pedido</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Método</th><th className="px-6 text-right">Acciones</th>
      </tr></thead>
      <tbody>
        {loading && <tr><td colSpan={7} className="py-8 text-center">Cargando ventas...</td></tr>}
        {!loading && ventas.map((venta) => <tr key={venta._id} className="border-b border-white/5 transition hover:bg-white/5">
          <td className="px-6 py-4">{new Date(venta.createdAt).toLocaleString("es-BO")}</td><td>{venta.numeroPedido}</td>
          <td>{venta.snapshotCliente?.nombreCompleto || venta.cliente?.nombreCompleto || "Venta mostrador"}</td>
          <td>{venta.vendedor?.nombreCompleto || "Sin vendedor"}</td><td className="font-semibold text-cyan-400">Bs {venta.total}</td><td>{venta.metodoPago}</td>
          <td className="px-6 text-right"><button className="btn-link" onClick={() => onVerDetalle(venta)}>Ver detalle</button></td>
        </tr>)}
        {!loading && ventas.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No hay ventas que coincidan con los filtros</td></tr>}
      </tbody>
    </table></div>
    <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={[10,25,50]} totalItems={totalItems} disabled={loading} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
  </div>;
}
