"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { Variante } from "@/types/producto";
import { uploadVarianteImages } from "@/services/upload.service";
import { getVarianteImagenes } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import {
  COLOR_OPTIONS,
  TALLA_OPTIONS,
  getVariantSelectOptions,
} from "@/constants/variant-options";

type VarianteTallaForm = {
  talla: string;
  stock: number;
  codigoBarra?: string;
  qrCode?: string;
};

type VarianteSharedForm = {
  color: string;
  colorSecundario: string;
  descripcion: string;
  imagenes: string[];
};

const createEmptySizeRow = (): VarianteTallaForm => ({
  talla: "",
  stock: 0,
});

const normalizeVariantKey = (
  color: string,
  colorSecundario: string | undefined,
  talla: string
) =>
  `${color.trim().toLowerCase()}::${(colorSecundario || "").trim().toLowerCase()}::${talla.trim().toLowerCase()}`;

export default function VarianteForm({
  initialData,
  existingVariantes = [],
  onSave,
  onCancel,
}: {
  initialData?: Variante;
  existingVariantes?: Variante[];
  onSave: (data: Variante[]) => void;
  onCancel: () => void;
}) {
  const [sharedForm, setSharedForm] = useState<VarianteSharedForm>({
    color: initialData?.color || "",
    colorSecundario: initialData?.colorSecundario || "",
    descripcion: initialData?.descripcion || "",
    imagenes: getVarianteImagenes(initialData),
  });
  const [sizeRows, setSizeRows] = useState<VarianteTallaForm[]>(() => {
    if (initialData) {
      return [
        {
          talla: initialData.talla || "",
          stock: initialData.stock || 0,
          codigoBarra: initialData.codigoBarra || "",
          qrCode: initialData.qrCode || "",
        },
      ];
    }

    return [createEmptySizeRow()];
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const isEdit = Boolean(initialData);
  const colorOptions = getVariantSelectOptions(sharedForm.color, COLOR_OPTIONS);
  const secondaryColorOptions = getVariantSelectOptions(
    sharedForm.colorSecundario,
    COLOR_OPTIONS
  );

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

      setSharedForm((prev) => ({
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
        error instanceof Error
          ? error.message
          : "No se pudieron subir las imagenes";

      toast.error(message);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const removeImage = (imageUrl: string) => {
    setSharedForm((prev) => ({
      ...prev,
      imagenes: (prev.imagenes ?? []).filter((image) => image !== imageUrl),
    }));
  };

  const updateSizeRow = (
    index: number,
    field: keyof VarianteTallaForm,
    value: string | number
  ) => {
    setSizeRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const addSizeRow = () => {
    setSizeRows((prev) => [...prev, createEmptySizeRow()]);
  };

  const removeSizeRow = (index: number) => {
    setSizeRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSave = () => {
    const color = sharedForm.color.trim();
    const colorSecundario = sharedForm.colorSecundario.trim();
    const descripcion = sharedForm.descripcion.trim();
    const imagenes = sharedForm.imagenes ?? [];

    if (!color) {
      toast.error("Debes ingresar un color");
      return;
    }

    const sanitizedRows = sizeRows.map((row) => ({
      ...row,
      talla: row.talla.trim(),
      stock: Number(row.stock),
    }));

    if (sanitizedRows.some((row) => !row.talla)) {
      toast.error("Cada fila debe tener una talla");
      return;
    }

    if (
      sanitizedRows.some(
        (row) =>
          !Number.isInteger(row.stock) ||
          Number.isNaN(row.stock) ||
          row.stock < 0
      )
    ) {
      toast.error("La cantidad debe ser un numero entero mayor o igual a 0");
      return;
    }

    const draftKeys = sanitizedRows.map((row) =>
      normalizeVariantKey(color, colorSecundario, row.talla)
    );
    if (new Set(draftKeys).size !== draftKeys.length) {
      toast.error(
        "No puedes repetir la misma talla para la misma combinacion de colores"
      );
      return;
    }

    const originalKey = initialData
      ? normalizeVariantKey(
          initialData.color,
          initialData.colorSecundario,
          initialData.talla
        )
      : null;

    const existingKeys = new Set(
      existingVariantes
        .map((variante) =>
          normalizeVariantKey(
            variante.color,
            variante.colorSecundario,
            variante.talla
          )
        )
        .filter((key) => key !== originalKey)
    );

    if (draftKeys.some((key) => existingKeys.has(key))) {
      toast.error(
        "Ya existe una variante registrada con esa combinacion de colores y talla"
      );
      return;
    }

    onSave(
      sanitizedRows.map((row) => ({
        color,
        colorSecundario: colorSecundario || undefined,
        talla: row.talla,
        stock: row.stock,
        descripcion: descripcion || undefined,
        imagenes,
        codigoBarra: row.codigoBarra || undefined,
        qrCode: row.qrCode || undefined,
      }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <select
          className="input"
          value={sharedForm.color}
          onChange={(e) =>
            setSharedForm((prev) => ({ ...prev, color: e.target.value }))
          }
        >
          <option value="">Selecciona un color</option>
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={sharedForm.colorSecundario}
          onChange={(e) =>
            setSharedForm((prev) => ({
              ...prev,
              colorSecundario: e.target.value,
            }))
          }
        >
          <option value="">Color secundario (opcional)</option>
          {secondaryColorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">
              {isEdit ? "Datos de la variante" : "Tallas y cantidades"}
            </p>
            {!isEdit && (
              <p className="text-xs text-gray-400">
                Reutiliza el mismo color, descripcion e imagenes para varias
                tallas.
              </p>
            )}
          </div>

          {!isEdit && (
            <button
              type="button"
              className="btn-link"
              onClick={addSizeRow}
            >
              + Agregar talla
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sizeRows.map((row, index) => (
            <div
              key={`${index}-${row.codigoBarra || "new"}`}
              className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-black/10 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <select
                className="input"
                value={row.talla}
                onChange={(e) => updateSizeRow(index, "talla", e.target.value)}
              >
                <option value="">Selecciona una talla</option>
                {getVariantSelectOptions(row.talla, TALLA_OPTIONS).map(
                  (talla) => (
                    <option key={talla} value={talla}>
                      {talla}
                    </option>
                  )
                )}
              </select>
              <input
                type="number"
                className="input"
                placeholder="Cantidad / stock"
                min={0}
                step={1}
                value={row.stock}
                onChange={(e) =>
                  updateSizeRow(index, "stock", Number(e.target.value))
                }
              />
              {!isEdit && sizeRows.length > 1 ? (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => removeSizeRow(index)}
                >
                  Quitar
                </button>
              ) : (
                <div />
              )}
            </div>
          ))}
        </div>
      </div>

      <textarea
        className="input w-full min-h-[80px]"
        placeholder="Descripcion de la variante (opcional)"
        value={sharedForm.descripcion}
        onChange={(e) =>
          setSharedForm((prev) => ({ ...prev, descripcion: e.target.value }))
        }
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

      {(sharedForm.imagenes?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {sharedForm.imagenes?.map((imageUrl, index) => (
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
            <label className="label">Codigo de barras</label>
            <input
              className="input bg-white/5 text-gray-400 cursor-not-allowed"
              value={sizeRows[0]?.codigoBarra || ""}
              disabled
            />
          </div>

          <div>
            <label className="label">QR</label>
            <input
              className="input bg-white/5 text-gray-400 cursor-not-allowed"
              value={sizeRows[0]?.qrCode || ""}
              disabled
            />
          </div>
        </div>
      )}

      {!isEdit && (
        <p className="text-xs text-gray-400">
          Los campos `codigoBarra` y `qrCode` se generaran automaticamente al
          guardar.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="btn-primary flex-1"
          disabled={uploadingImage}
        >
          {isEdit ? "Guardar cambios" : "Guardar variantes"}
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
