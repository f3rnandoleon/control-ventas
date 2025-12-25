"use client";

import { useEffect, useState } from "react";
import { getProductos } from "@/services/producto.service";
import VentaPOS from "@/components/ventas/VentaPOS";
import { Producto } from "@/types/producto";

export default function VendedorVentasPage() {
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    getProductos().then(setProductos);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Registrar venta</h1>
      <VentaPOS productos={productos} onSuccess={() => {}} />
    </div>
  );
}
