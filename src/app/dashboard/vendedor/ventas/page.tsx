"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getMisVentas } from "@/services/pedidos.service";
import { getProductos } from "@/services/producto.service";
import VentaDetalleModal from "@/components/ventas/VentaDetalleModal";
import VentaPOS from "@/components/ventas/VentaPOS";
import VentaTable from "@/components/ventas/VentaTable";
import type { Pedido } from "@/types/pedido";
import type { Producto } from "@/types/producto";

export default function VendedorVentasPage() {
  const router = useRouter();
  const [vista, setVista] = useState<"nueva" | "historial">("nueva");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<Pedido[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Pedido | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setVista(params.get("vista") === "historial" ? "historial" : "nueva");
  }, []);

  const changeVista = (nextVista: "nueva" | "historial") => {
    setVista(nextVista);
    router.push(`/dashboard/vendedor/ventas?vista=${nextVista}`);
  };

  useEffect(() => {
    getProductos({ withStock: true })
      .then(setProductos)
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudieron cargar productos"));
  }, [refreshKey]);

  useEffect(() => {
    setLoadingVentas(true);
    getMisVentas()
      .then(setVentas)
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar tu historial de ventas"))
      .finally(() => setLoadingVentas(false));
  }, [refreshKey]);

  const totalPages = Math.max(1, Math.ceil(ventas.length / pageSize));
  const ventasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize;
    return ventas.slice(start, start + pageSize);
  }, [ventas, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-gray-400">Registra una venta o revisa tu historial reciente.</p>
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
            <p className="text-sm text-gray-400">Consulta las ventas registradas con tu usuario.</p>
          </div>
          <VentaTable
            ventas={ventasPaginadas}
            onVerDetalle={setVentaSeleccionada}
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={ventas.length}
            loading={loadingVentas}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </section>
      )}

      <VentaDetalleModal Pedido={ventaSeleccionada} onClose={() => setVentaSeleccionada(null)} />
    </div>
  );
}
