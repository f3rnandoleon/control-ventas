"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import VentaDetalleModal from "@/components/ventas/VentaDetalleModal";
import VentaTable from "@/components/ventas/VentaTable";
import { getMisVentas } from "@/services/pedidos.service";
import type { Pedido } from "@/types/pedido";

export default function VendedorHistorialVentasPage() {
  const [ventas, setVentas] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Pedido | null>(null);

  useEffect(() => {
    setLoading(true);
    getMisVentas()
      .then(setVentas)
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar tu historial de ventas"))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(ventas.length / pageSize));
  const ventasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize;
    return ventas.slice(start, start + pageSize);
  }, [ventas, page, pageSize]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de ventas</h1>
        <p className="text-sm text-gray-400">Consulta las ventas registradas con tu usuario.</p>
      </div>
      <VentaTable
        ventas={ventasPaginadas}
        onVerDetalle={setVentaSeleccionada}
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={ventas.length}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
      <VentaDetalleModal Pedido={ventaSeleccionada} onClose={() => setVentaSeleccionada(null)} />
    </div>
  );
}
