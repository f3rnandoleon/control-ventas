"use client";

import { InventarioItem } from "@/types/inventario";
import { ProductoInventario } from "@/types/inventario";

export default function InventarioResumen({
  items,
  productos,
}: {
  items: InventarioItem[];
  productos: ProductoInventario[];
}) {
  const entradas = items.filter((i) => i.tipo === "ENTRADA").length;
  const salidas = items.filter((i) => i.tipo === "SALIDA").length;
  const ajustes = items.filter((i) => i.tipo === "AJUSTE").length;

  // Calcular valores del inventario
  const valorCosto = productos.reduce((total, producto) => {
    const stockTotal = producto.variantes.reduce((sum, v) => sum + v.stock, 0);
    return total + stockTotal * producto.precioCosto;
  }, 0);

  const valorVenta = productos.reduce((total, producto) => {
    const stockTotal = producto.variantes.reduce((sum, v) => sum + v.stock, 0);
    return total + stockTotal * producto.precioVenta;
  }, 0);

  const gananciaPotencial = valorVenta - valorCosto;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Movimientos */}
      <Card title="Entradas" value={entradas} color="green" />
      <Card title="Salidas" value={salidas} color="red" />
      <Card title="Ajustes" value={ajustes} color="yellow" />

      {/* Valores */}
      <Card
        title="Valor Total (Costo)"
        value={`Bs ${valorCosto.toFixed(2)}`}
        color="cyan"
        icon="💰"
      />
      <Card
        title="Valor Potencial (Venta)"
        value={`Bs ${valorVenta.toFixed(2)}`}
        color="purple"
        icon="💵"
      />
      <Card
        title="Ganancia Potencial"
        value={`Bs ${gananciaPotencial.toFixed(2)}`}
        color="emerald"
        icon="📈"
      />
    </div>
  );
}

function Card({
  title,
  value,
  color = "cyan",
  icon,
}: {
  title: string;
  value: number | string;
  color?: "cyan" | "green" | "red" | "yellow" | "purple" | "emerald";
  icon?: string;
}) {
  const colorClasses = {
    cyan: "text-cyan-400",
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    emerald: "text-emerald-400",
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-[0_0_15px_rgba(0,180,255,0.15)]">
      <p className="text-gray-400 text-xs mb-1">{title}</p>
      <p className={`text-xl font-bold ${colorClasses[color]} mt-1 flex items-center gap-2`}>
        {icon && <span className="text-base">{icon}</span>}
        <span>{value}</span>
      </p>
    </div>
  );
}
