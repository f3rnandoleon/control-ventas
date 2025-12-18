"use client";

import { useEffect, useState } from "react";
import { getInventario } from "@/services/inventario.service";
import { InventarioItem } from "@/types/inventario";
import InventarioTable from "@/components/inventario/InventarioTable";
import InventarioResumen from "@/components/inventario/InventarioResumen";

export default function AdminInventarioPage() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setItems(await getInventario());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventario</h1>

      <InventarioResumen items={items} />

      <InventarioTable items={items} loading={loading} />
    </div>
  );
}
