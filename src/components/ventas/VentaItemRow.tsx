"use client";

import { Producto } from "@/types/producto";

import type { VentaFormItem } from "@/types/venta";

interface Props {
  item: VentaFormItem;
  productos: Producto[];
  onChange: (data: VentaFormItem) => void;
  onRemove: () => void;
}


export default function VentaItemRow({
  item,
  productos,
  onChange,
  onRemove,
}: Props) {
  const producto = productos.find((p) => p._id === item.productoId);

  const variantes = producto?.variantes || [];

  return (
    <div className="grid grid-cols-6 gap-3 items-end">
      {/* Producto */}
      <select
        className="input col-span-2"
        value={item.productoId}
        onChange={(e) => {
          const p = productos.find(p => p._id === e.target.value);
          if (!p || p.variantes.length === 0) return;

          const v = p.variantes[0];

          onChange({
            productoId: p._id,
            productoNombre: p.nombre,
            color: v.color,
            talla: v.talla,
            stockDisponible: v.stock,
            cantidad: 1,
          });
        }}
      >
        <option value="">Producto</option>
        {productos.map((p) => (
          <option key={p._id} value={p._id}>
            {p.nombre}
          </option>
        ))}
      </select>

      {/* Variante */}
      <select
        className="input"
        value={`${item.color}-${item.talla}`}
        disabled={!producto}
        onChange={(e) => {
          const [color, talla] = e.target.value.split("|");
          const v = producto?.variantes.find(
            (x) => x.color === color && x.talla === talla
          );
          if (!v) return;

          onChange({
            ...item,
            color,
            talla,
            stockDisponible: v.stock,
            cantidad: 1,
          });
        }}
      >
        <option value="">Variante</option>
        {variantes.map((v) => (
          <option
            key={`${v.color}-${v.talla}`}
            value={`${v.color}|${v.talla}`}
          >
            {v.color} / {v.talla} (stock: {v.stock})
          </option>
        ))}
      </select>

      {/* Cantidad */}
      <input
        type="number"
        min={1}
        max={item.stockDisponible}
        className="input"
        value={item.cantidad}
        onChange={(e) =>
          onChange({
            ...item,
            cantidad: Number(e.target.value),
          })
        }
      />

      {/* Stock */}
      <div className="text-sm text-gray-400">
        Stock: {item.stockDisponible ?? "-"}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="btn-danger text-sm"
      >
        ✕
      </button>
    </div>
  );
}
