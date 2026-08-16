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
    <div>
      <VentaPOS productos={productos} onSuccess={() => setRefreshKey((key) => key + 1)} />
    </div>
  );
}
