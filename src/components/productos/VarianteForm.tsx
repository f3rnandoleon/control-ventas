"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { Variante } from "@/types/producto";
import { uploadVarianteImages } from "@/services/upload.service";
import { getVarianteImagenes } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";

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
    descripcion: initialData?.descripcion || "",
    imagenes: getVarianteImagenes(initialData),
    codigoBarra: initialData?.codigoBarra || "",
    qrCode: initialData?.qrCode || "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const isEdit = Boolean(initialData);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    const invalidFile = files.find((file) => !file.type.startsWith("image/"));
    if (invalidFile) {
      toast.error("Todos los archivos deben ser imagenes validas");
      event.target.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    const oversizedFile = files.find((file) => file.size > maxSizeBytes);
    if (oversizedFile) {
      toast.error("Cada imagen debe pesar como maximo 5 MB");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);

    try {
      const uploadedImages = await uploadVarianteImages(files);

      setForm((prev) => ({
        ...prev,
        imagenes: [...new Set([...(prev.imagenes ?? []), ...uploadedImages])],
      }));

      toast.success(
        files.length === 1
          ? "Imagen subida a Cloudinary"
          : "Imagenes subidas a Cloudinary"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron subir las imagenes";

      toast.error(message);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const removeImage = (imageUrl: string) => {
    setForm((prev) => ({
      ...prev,
      imagenes: (prev.imagenes ?? []).filter((image) => image !== imageUrl),
    }));
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

      <textarea
        className="input w-full min-h-[80px]"
        placeholder="Descripción de la variante (opcional)"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
      />

      <div className="space-y-2">
        <label className="label">Subir imagenes a Cloudinary (opcional)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          className="input"
          onChange={handleImageUpload}
          disabled={uploadingImage}
        />
        {uploadingImage && (
          <p className="text-sm text-gray-400">Subiendo imagenes...</p>
        )}
      </div>

      {(form.imagenes?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {form.imagenes?.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className="rounded-xl border border-white/10 bg-white/5 p-2"
              >
                <CloudinaryImage
                  src={imageUrl}
                  alt={`Preview variante ${index + 1}`}
                  width={192}
                  height={96}
                  className="h-24 w-full rounded object-cover border border-white/10"
                />
                <button
                  type="button"
                  className="btn-danger mt-2 w-full"
                  onClick={() => removeImage(imageUrl)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            La primera imagen se usara como portada en las vistas de listado.
          </p>
        </div>
      )}

      {isEdit && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">CÃ³digo de barras</label>
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
              descripcion: form.descripcion,
              imagenes: form.imagenes || [],
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
