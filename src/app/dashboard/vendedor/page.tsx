"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getVentas } from "@/services/venta.service";
import { Venta } from "@/types/venta";
import VendedorStats from "@/components/vendedor/VendedorStats";
import VentasPropiasRecientes from "@/components/vendedor/VentasPropiasRecientes";
import Link from "next/link";

export default function VendedorDashboardPage() {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);

  useEffect(() => {
    const load = async () => {
      const allVentas = await getVentas();
      const propias = allVentas.filter(
        (v: any) => v.vendedor?._id === user?.id
      );
      setVentas(propias);
    };
    if (user) load();
  }, [user]);

  const today = new Date().toDateString();

  const ventasHoy = ventas.filter(
    (v) => new Date(v.createdAt).toDateString() === today
  );

  const totalHoy = ventasHoy.reduce((s, v) => s + v.total, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Bienvenido, {user?.fullname}
      </h1>

      <VendedorStats
        ventasHoy={ventasHoy.length}
        totalHoy={totalHoy}
      />

      <div className="flex gap-4">
        <Link
          href="/dashboard/vendedor/ventas"
          className="btn-primary"
        >
          Registrar venta
        </Link>
      </div>

      <VentasPropiasRecientes ventas={ventas.slice(0, 5)} />
    </div>
  );
}
