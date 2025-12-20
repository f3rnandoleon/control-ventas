"use client";

import { useEffect, useState } from "react";
import { getVentas } from "@/services/venta.service";
import { getProductos } from "@/services/producto.service";
import ReportesResumen from "@/components/reportes/ReportesResumen";
import VentasPorFechaChart from "@/components/reportes/VentasPorFechaChart";
import ProductosMasVendidos from "@/components/reportes/ProductosMasVendidos";
import ReportesFiltros from "@/components/reportes/ReportesFiltros";
import ComparativaMensualChart from "@/components/reportes/ComparativaMensualChart";

export default function AdminReportesPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [metodo, setMetodo] = useState("");

  useEffect(() => {
    const load = async () => {
      setVentas(await getVentas());
      setProductos(await getProductos());
    };
    load();
  }, []);
  const ventasFiltradas = ventas.filter((v) => {
    const fechaVenta = new Date(v.createdAt);

    if (from && fechaVenta < new Date(from)) return false;
    if (to && fechaVenta > new Date(to + "T23:59:59")) return false;
    if (metodo && v.metodoPago !== metodo) return false;

    return true;
  });
  // KPIs
  const totalVentas = ventasFiltradas.reduce((s, v) => s + v.total, 0);
  const gananciaTotal = ventasFiltradas.reduce(
    (s, v) => s + (v.gananciaTotal || 0),
    0
  );

  
  const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}`;

  // Ventas por fecha
  const ventasPorFecha = ventas.reduce((acc: any, v) => {
    const fecha = new Date(v.createdAt).toLocaleDateString();
    acc[fecha] = (acc[fecha] || 0) + v.total;
    return acc;
  }, {});

  const ventasChartData = Object.keys(ventasPorFecha).map((fecha) => ({
    fecha,
    total: ventasPorFecha[fecha],
  }));

  // Top productos
  const topProductos = [...productos]
    .sort((a, b) => b.totalVendidos - a.totalVendidos)
    .slice(0, 5)
    .map((p) => ({
      nombre: p.nombre,
      totalVendidos: p.totalVendidos,
    }));
    const now = new Date();
    const currentMonthKey = getMonthKey(now);

    const lastMonthDate = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const lastMonthKey = getMonthKey(lastMonthDate);

    const mensual = ventas.reduce(
      (acc: any, v) => {
        const key = getMonthKey(new Date(v.createdAt));
        if (key === currentMonthKey) acc.actual += v.total;
        if (key === lastMonthKey) acc.anterior += v.total;
        return acc;
      },
      { actual: 0, anterior: 0 }
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reportes</h1>

        <ReportesFiltros
          from={from}
          to={to}
          metodo={metodo}
          onChange={({ from, to, metodo }) => {
            if (from !== undefined) setFrom(from);
            if (to !== undefined) setTo(to);
            if (metodo !== undefined) setMetodo(metodo);
          }}
        />

        <ReportesResumen
          totalVentas={totalVentas}
          gananciaTotal={gananciaTotal}
          cantidadVentas={ventasFiltradas.length}
        />

        <VentasPorFechaChart data={ventasChartData} />

        <ComparativaMensualChart
          actual={mensual.actual}
          anterior={mensual.anterior}
        />

    </div>
  );
}
