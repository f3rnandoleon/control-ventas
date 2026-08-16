"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import VentaPOS from "@/components/ventas/VentaPOS";
import { getProductos } from "@/services/producto.service";
import type { Producto } from "@/types/producto";

export default function AdminNuevaVentaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getProductos({ withStock: true })
      .then(setProductos)
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudieron cargar productos"));
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nueva venta</h1>
        <p className="text-sm text-gray-400">Registra una venta desde el punto de venta.</p>
      </div>
      <VentaPOS productos={productos} onSuccess={() => setRefreshKey((key) => key + 1)} />
    </div>
  );
}
