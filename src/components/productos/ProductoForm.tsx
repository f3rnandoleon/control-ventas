"use client";

import { useState } from "react";
import { Producto } from "@/types/producto";

export default function ProductoForm({
  initialData,
  onSubmit,
}: {
  initialData?: Partial<Producto>;
  onSubmit: (data: Partial<Producto>) => void;
}) {
  const [form, setForm] = useState({
    nombre: initialData?.nombre || "",
    modelo: initialData?.modelo || "",
    sku: initialData?.sku || "",
    precioVenta: initialData?.precioVenta || 0,
    precioCosto: initialData?.precioCosto || 0,
  });
  

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-5"
    >
      <div>
        <label className="label">Nombre del producto</label>
        <input
          className="input"
          placeholder="Chompa Invierno"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="label">Modelo</label>
        <input
          className="input"
          placeholder="INV-2025"
          value={form.modelo}
          onChange={(e) => setForm({ ...form, modelo: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Precio venta (Bs)</label>
          <input
            type="number"
            className="input"
            value={form.precioVenta}
            onChange={(e) =>
              setForm({ ...form, precioVenta: Number(e.target.value) })
            }
            required
          />
        </div>

        <div>
          <label className="label">Precio costo (Bs)</label>
          <input
            type="number"
            className="input"
            value={form.precioCosto}
            onChange={(e) =>
              setForm({ ...form, precioCosto: Number(e.target.value) })
            }
            required
          />
        </div>
        <div>
          <label className="label">SKU</label>
          <input
            className="input"
            placeholder="SKU-INV-001"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            required
          />
        </div>

      </div>

      <button className="btn-primary">
        {initialData ? "Actualizar producto" : "Guardar producto"}
      </button>
    </form>
  );
}
