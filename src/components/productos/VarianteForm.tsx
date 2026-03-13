"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { Variante } from "@/types/producto";
import { uploadVarianteImage } from "@/services/upload.service";

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const isEdit = Boolean(initialData);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen valido");
      event.target.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error("La imagen no puede superar los 5 MB");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);

    try {
      const imageUrl = await uploadVarianteImage(file);
      setForm((prev) => ({ ...prev, imagen: imageUrl }));
      toast.success("Imagen subida a Cloudinary");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir la imagen";

      toast.error(message);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
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
        <label className="label">Subir imagen a Cloudinary (opcional)</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={handleImageUpload}
          disabled={uploadingImage}
        />
        {uploadingImage && (
          <p className="text-sm text-gray-400">Subiendo imagen...</p>
        )}
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
          type="button"
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
          disabled={uploadingImage}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-danger flex-1"
          disabled={uploadingImage}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
