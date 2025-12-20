"use client";

import { useEffect, useState } from "react";
import { getVentas } from "@/services/venta.service";
import { getProductos } from "@/services/producto.service";
import DashboardStats from "@/components/dashboard/DashboardStats";
import VentasRecientes from "@/components/dashboard/VentasRecientes";
import TopProductosDashboard from "@/components/dashboard/TopProductosDashboard";
import StockCritico from "@/components/dashboard/StockCritico";

export default function AdminDashboardPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setVentas(await getVentas());
      setProductos(await getProductos());
    };
    load();
  }, []);

  // Fechas
  const today = new Date().toDateString();
  const now = new Date();

  const ventasHoy = ventas
    .filter(
      (v) => new Date(v.createdAt).toDateString() === today
    )
    .reduce((s, v) => s + v.total, 0);

  const ventasMes = ventas
    .filter(
      (v) =>
        new Date(v.createdAt).getMonth() === now.getMonth() &&
        new Date(v.createdAt).getFullYear() === now.getFullYear()
    )
    .reduce((s, v) => s + v.total, 0);

  const gananciaMes = ventas
    .filter(
      (v) =>
        new Date(v.createdAt).getMonth() === now.getMonth()
    )
    .reduce((s, v) => s + (v.gananciaTotal || 0), 0);

  const ventasRecientes = ventas.slice(0, 5);

  const topProductos = [...productos]
    .sort((a, b) => b.totalVendidos - a.totalVendidos)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <DashboardStats
        ventasHoy={ventasHoy}
        ventasMes={ventasMes}
        gananciaMes={gananciaMes}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VentasRecientes ventas={ventasRecientes} />
        <TopProductosDashboard productos={topProductos} />
      </div>

      <StockCritico productos={productos} />
    </div>
  );
}
