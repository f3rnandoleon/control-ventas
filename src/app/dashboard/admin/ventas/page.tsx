"use client";

import { useEffect, useState } from "react";
import { getVentas } from "@/services/venta.service";
import { getProductos } from "@/services/producto.service";
import { Venta } from "@/types/venta";
import VentaPOS from "@/components/ventas/VentaPOS";
import { useAuth } from "@/context/AuthContext";
import VentaTable from "@/components/ventas/VentaTable";
import VentaDetalleModal from "@/components/ventas/VentaDetalleModal";

export default function AdminVentasPage() {
  const { loading: authLoading } = useAuth();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const load = async () => {
    try {
      setLoading(true);
      setVentas(await getVentas());
      setProductos(await getProductos());
    } catch (error) {
      console.error("VENTAS LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      load();
    }
  }, [authLoading]);

  if (authLoading || loading) {
    return <p className="text-gray-400">Cargando ventas...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ventas</h1>

      <VentaPOS productos={productos} onSuccess={load} />
      {/* Historial */}
      <VentaTable
        ventas={ventas}
        onVerDetalle={(venta) => setVentaSeleccionada(venta)}
      />

      {/* Modal detalle */}
      <VentaDetalleModal
        venta={ventaSeleccionada}
        onClose={() => setVentaSeleccionada(null)}
      />
      
    </div>
  );
}
