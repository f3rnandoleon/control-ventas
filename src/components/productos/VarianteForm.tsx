"use client";

import { ChangeEvent, useState } from "react";
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
    imagen: initialData?.imagen || "",
    codigoBarra: initialData?.codigoBarra || "",
    qrCode: initialData?.qrCode || "",
  });
  const isEdit = Boolean(initialData);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, imagen: result }));
      }
    };
    reader.readAsDataURL(file);
  };

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

      

      <div className="space-y-2">
        <label className="label">Subir imagen (opcional)</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={handleImageUpload}
        />
      </div>

      {form.imagen && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.imagen}
            alt="Preview variante"
            className="h-24 w-24 rounded object-cover border border-white/10"
          />
          <button
            type="button"
            className="btn-danger"
            onClick={() => setForm({ ...form, imagen: "" })}
          >
            Quitar imagen
          </button>
        </div>
      )}
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
          onClick={() => {
            onSave({
              color: form.color,
              talla: form.talla,
              stock: form.stock,
              imagen: form.imagen?.trim() || undefined,
              codigoBarra: form.codigoBarra || undefined,
              qrCode: form.qrCode || undefined,
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
