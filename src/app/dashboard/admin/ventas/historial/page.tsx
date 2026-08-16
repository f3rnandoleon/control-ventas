"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import VentaDetalleModal from "@/components/ventas/VentaDetalleModal";
import VentaFilters, { EMPTY_VENTA_FILTERS, type VentaFilterValues } from "@/components/ventas/VentaFilters";
import VentaTable from "@/components/ventas/VentaTable";
import { getVentasPage, type PaginatedSalesResponse } from "@/services/pedidos.service";
import type { Pedido } from "@/types/pedido";

const EMPTY_PAGE: PaginatedSalesResponse = { items: [], page: 1, limit: 25, total: 0, totalPages: 1 };

export default function AdminHistorialVentasPage() {
  const [result, setResult] = useState(EMPTY_PAGE);
  const [filters, setFilters] = useState<VentaFilterValues>(EMPTY_VENTA_FILTERS);
  const [debouncedText, setDebouncedText] = useState({ customer: "", seller: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Pedido | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText({ customer: filters.customer.trim(), seller: filters.seller.trim() });
    }, 350);

    return () => clearTimeout(timer);
  }, [filters.customer, filters.seller]);

  useEffect(() => {
    setPage(1);
  }, [filters.from, filters.to, filters.paymentMethod, debouncedText]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getVentasPage({
      page,
      limit: pageSize,
      from: filters.from || undefined,
      to: filters.to || undefined,
      customer: debouncedText.customer || undefined,
      seller: debouncedText.seller || undefined,
      paymentMethod: filters.paymentMethod || undefined,
    }, controller.signal)
      .then(setResult)
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") toast.error(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, pageSize, filters.from, filters.to, filters.paymentMethod, debouncedText]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de ventas</h1>
        <p className="text-sm text-gray-400">Filtra por fecha, cliente, vendedor o metodo de pago.</p>
      </div>
      <VentaFilters value={filters} onChange={setFilters} />
      <VentaTable
        ventas={result.items}
        onVerDetalle={setVentaSeleccionada}
        currentPage={page}
        totalPages={result.totalPages}
        pageSize={pageSize}
        totalItems={result.total}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
      <VentaDetalleModal Pedido={ventaSeleccionada} onClose={() => setVentaSeleccionada(null)} />
    </div>
  );
}
