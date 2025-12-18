"use client";

import { useState } from "react";
import { Variante } from "@/types/producto";

export default function VarianteForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: Variante;
  onSave: (data: Variante) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Variante>({
    color: initialData?.color || "",
    talla: initialData?.talla || "",
    stock: initialData?.stock || 0,
    codigoBarra: initialData?.codigoBarra || "",
    qrCode: initialData?.qrCode || "",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          className="input"
          placeholder="Color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <input
          className="input"
          placeholder="Talla"
          value={form.talla}
          onChange={(e) => setForm({ ...form, talla: e.target.value })}
        />
      </div>

      <input
        type="number"
        className="input"
        placeholder="Stock"
        value={form.stock}
        onChange={(e) =>
          setForm({ ...form, stock: Number(e.target.value) })
        }
      />

      <input
        className="input"
        placeholder="Código de barras"
        value={form.codigoBarra}
        onChange={(e) =>
          setForm({ ...form, codigoBarra: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="QR Code"
        value={form.qrCode}
        onChange={(e) =>
          setForm({ ...form, qrCode: e.target.value })
        }
      />

      <div className="flex gap-3">
        <button
          onClick={() => onSave(form)}
          className="btn-primary flex-1"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="btn-danger flex-1"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
