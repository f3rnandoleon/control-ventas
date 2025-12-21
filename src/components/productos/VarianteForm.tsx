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
  const isEdit = Boolean(initialData);

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
      {isEdit && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">Código de barras</label>
            <input
              className="input bg-white/5 text-gray-400 cursor-not-allowed"
              value={form.codigoBarra}
              disabled
            />
          </div>

          <div>
            <label className="label">QR</label>
            <input
              className="input bg-white/5 text-gray-400 cursor-not-allowed"
              value={form.qrCode}
              disabled
            />
          </div>
        </div>
      )}

      

      <div className="flex gap-3">
        <button
          onClick={() => {onSave({
                              color: form.color,
                              talla: form.talla,
                              stock: form.stock,
                            });
                          }}
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
