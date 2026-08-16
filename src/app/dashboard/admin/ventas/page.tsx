"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getVentasPage, type PaginatedSalesResponse } from "@/services/pedidos.service";
import { getProductos } from "@/services/producto.service";
import type { Pedido } from "@/types/pedido";
import type { Producto } from "@/types/producto";
import VentaPOS from "@/components/ventas/VentaPOS";
import VentaTable from "@/components/ventas/VentaTable";
import VentaDetalleModal from "@/components/ventas/VentaDetalleModal";
import VentaFilters, { EMPTY_VENTA_FILTERS, type VentaFilterValues } from "@/components/ventas/VentaFilters";
import { useAuth } from "@/context/AuthContext";

const EMPTY_PAGE: PaginatedSalesResponse = { items: [], page: 1, limit: 25, total: 0, totalPages: 1 };

export default function AdminVentasPage() {
  const router = useRouter();
  const [vista, setVista] = useState<"nueva" | "historial">("nueva");
  const { loading: authLoading } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [result, setResult] = useState(EMPTY_PAGE);
  const [filters, setFilters] = useState<VentaFilterValues>(EMPTY_VENTA_FILTERS);
  const [debouncedText, setDebouncedText] = useState({ customer: "", seller: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Pedido | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setVista(params.get("vista") === "historial" ? "historial" : "nueva");
  }, []);

  const changeVista = (nextVista: "nueva" | "historial") => {
    setVista(nextVista);
    router.push(`/dashboard/admin/ventas?vista=${nextVista}`);
  };

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
    if (authLoading) return;
    getProductos({ withStock: true })
      .then(setProductos)
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudieron cargar productos"));
  }, [authLoading, refreshKey]);

  useEffect(() => {
    if (authLoading) return;
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
  }, [authLoading, page, pageSize, filters.from, filters.to, filters.paymentMethod, debouncedText, refreshKey]);

  if (authLoading) return <p className="text-gray-400">Cargando ventas...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-gray-400">Gestiona el registro y consulta el historial sin sobrecargar la vista.</p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button onClick={() => changeVista("nueva")} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${vista === "nueva" ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-white/10"}`}>Nueva venta</button>
          <button onClick={() => changeVista("historial")} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${vista === "historial" ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-white/10"}`}>Historial</button>
        </div>
      </div>

      {vista === "nueva" ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Nueva venta</h2>
          <VentaPOS productos={productos} onSuccess={() => { setPage(1); setRefreshKey((key) => key + 1); }} />
        </section>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Historial de ventas</h2>
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
        </section>
      )}

      <VentaDetalleModal Pedido={ventaSeleccionada} onClose={() => setVentaSeleccionada(null)} />
    </div>
  );
}
