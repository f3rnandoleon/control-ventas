"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { Variante, MedidasPrenda } from "@/types/producto";
import { uploadVarianteImages } from "@/services/upload.service";
import { getVarianteImagenes } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import {
  TALLA_OPTIONS,
  getColorOptions,
  getVariantSelectOptions,
} from "@/constants/variant-options";
import ColorSwatch from "@/components/ui/ColorSwatch";

type VarianteTallaForm = {
  varianteId?: string;
  talla: string;
  stock: number;
  codigoBarra?: string;
  qrCode?: string;
  precioVenta?: number | "";
  precioCosto?: number | "";
  medidas?: MedidasPrenda;
  showMedidas?: boolean;
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
  precioVenta: "",
  precioCosto: "",
  medidas: {},
  showMedidas: false,
});

const normalizeVariantKey = (
  color: string,
  colorSecundario: string | undefined,
  talla: string
) =>
  `${color.trim().toLowerCase()}::${(colorSecundario || "").trim().toLowerCase()}::${talla.trim().toLowerCase()}`;

export default function VarianteForm({
  initialData,
  initialVariantes,
  existingVariantes = [],
  precioBaseVenta,
  precioBaseCosto,
  onSave,
  onCancel,
}: {
  initialData?: Variante;
  initialVariantes?: Variante[];
  existingVariantes?: Variante[];
  precioBaseVenta?: number;
  precioBaseCosto?: number;
  onSave: (data: Variante[]) => void;
  onCancel: () => void;
}) {
  const editingVariantes =
    initialVariantes && initialVariantes.length > 0
      ? initialVariantes
      : initialData
        ? [initialData]
        : [];
  const firstEditingVariant = editingVariantes[0];
  const editingVariantIds = new Set(
    editingVariantes
      .map((variante) => variante.varianteId)
      .filter((varianteId): varianteId is string => Boolean(varianteId))
  );
  const editingVariantKeys = new Set(
    editingVariantes.map((variante) =>
      normalizeVariantKey(
        variante.color,
        variante.colorSecundario,
        variante.talla
      )
    )
  );
  const [sharedForm, setSharedForm] = useState<VarianteSharedForm>({
    color: firstEditingVariant?.color || "",
    colorSecundario: firstEditingVariant?.colorSecundario || "",
    descripcion: firstEditingVariant?.descripcion || "",
    imagenes: getVarianteImagenes(firstEditingVariant),
  });
  const [sizeRows, setSizeRows] = useState<VarianteTallaForm[]>(() => {
    if (editingVariantes.length > 0) {
      return editingVariantes.map((variante) => ({
        varianteId: variante.varianteId,
        talla: variante.talla || "",
        stock: variante.stock || 0,
        codigoBarra: variante.codigoBarra || "",
        qrCode: variante.qrCode || "",
        precioVenta:
          variante.precioVenta !== undefined && variante.precioVenta !== null
            ? variante.precioVenta
            : "",
        precioCosto:
          variante.precioCosto !== undefined && variante.precioCosto !== null
            ? variante.precioCosto
            : "",
        medidas: variante.medidas || {},
        showMedidas: Boolean(
          variante.medidas &&
            Object.values(variante.medidas).some(
              (v) => typeof v === "number" && v > 0
            )
        ),
      }));
    }

    return [createEmptySizeRow()];
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const isEdit = editingVariantes.length > 0;
  const colorOptions = getColorOptions(sharedForm.color);
  const secondaryColorOptions = getColorOptions(sharedForm.colorSecundario);

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
    value: unknown
  ) => {
    setSizeRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const updateMedidaField = (
    index: number,
    medidaKey: keyof MedidasPrenda,
    value: string
  ) => {
    const numValue = value === "" ? undefined : Number(value);
    setSizeRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const currentMedidas = row.medidas || {};
        return {
          ...row,
          medidas: {
            ...currentMedidas,
            [medidaKey]:
              numValue !== undefined && !Number.isNaN(numValue)
                ? numValue
                : undefined,
          },
        };
      })
    );
  };

  const addSizeRow = () => {
    setSizeRows((prev) => [...prev, createEmptySizeRow()]);
  };

  const removeSizeRow = (index: number) => {
    setSizeRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const hasAnyMedida = (medidas?: MedidasPrenda) => {
    if (!medidas) return false;
    return Object.values(medidas).some((v) => typeof v === "number" && v > 0);
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

    const sanitizedRows = sizeRows.map((row) => {
      // Limpiar y estructurar medidas
      const cleanMedidas: MedidasPrenda = {};
      if (row.medidas?.anchoPecho && Number(row.medidas.anchoPecho) > 0)
        cleanMedidas.anchoPecho = Number(row.medidas.anchoPecho);
      if (row.medidas?.anchoHombros && Number(row.medidas.anchoHombros) > 0)
        cleanMedidas.anchoHombros = Number(row.medidas.anchoHombros);
      if (row.medidas?.largoTotal && Number(row.medidas.largoTotal) > 0)
        cleanMedidas.largoTotal = Number(row.medidas.largoTotal);
      if (row.medidas?.largoMangaAxila && Number(row.medidas.largoMangaAxila) > 0)
        cleanMedidas.largoMangaAxila = Number(row.medidas.largoMangaAxila);
      if (row.medidas?.largoMangaHombro && Number(row.medidas.largoMangaHombro) > 0)
        cleanMedidas.largoMangaHombro = Number(row.medidas.largoMangaHombro);

      const hasMedidas = Object.keys(cleanMedidas).length > 0;

      const pVentaNum =
        row.precioVenta === "" || row.precioVenta === undefined || row.precioVenta === null
          ? undefined
          : Number(row.precioVenta);
      const pCostoNum =
        row.precioCosto === "" || row.precioCosto === undefined || row.precioCosto === null
          ? undefined
          : Number(row.precioCosto);

      return {
        ...row,
        talla: row.talla.trim(),
        stock: row.varianteId ? Math.max(0, Number(row.stock || 0)) : 0,
        precioVenta:
          pVentaNum !== undefined && !Number.isNaN(pVentaNum) && pVentaNum > 0
            ? pVentaNum
            : undefined,
        precioCosto:
          pCostoNum !== undefined && !Number.isNaN(pCostoNum) && pCostoNum > 0
            ? pCostoNum
            : undefined,
        medidas: hasMedidas ? cleanMedidas : undefined,
      };
    });

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

    for (const row of sanitizedRows) {
      if (
        row.precioVenta !== undefined &&
        row.precioCosto !== undefined &&
        row.precioVenta < row.precioCosto
      ) {
        toast.error(
          `En la talla ${row.talla}, el precio de venta (Bs ${row.precioVenta}) no puede ser menor al costo (Bs ${row.precioCosto})`
        );
        return;
      }
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

    const existingKeys = new Set(
      existingVariantes
        .map((variante) =>
          ({
            key: normalizeVariantKey(
              variante.color,
              variante.colorSecundario,
              variante.talla
            ),
            isEditingVariant:
              (variante.varianteId &&
                editingVariantIds.has(variante.varianteId)) ||
              editingVariantKeys.has(
                normalizeVariantKey(
                  variante.color,
                  variante.colorSecundario,
                  variante.talla
                )
              ),
          })
        )
        .filter((entry) => !entry.isEditingVariant)
        .map((entry) => entry.key)
    );

    if (draftKeys.some((key) => existingKeys.has(key))) {
      toast.error(
        "Ya existe una variante registrada con esa combinacion de colores y talla"
      );
      return;
    }

    onSave(
      sanitizedRows.map((row) => ({
        varianteId: row.varianteId || undefined,
        color,
        colorSecundario: colorSecundario || undefined,
        talla: row.talla,
        stock: row.stock,
        descripcion: descripcion || undefined,
        imagenes,
        codigoBarra: row.codigoBarra || undefined,
        qrCode: row.qrCode || undefined,
        precioVenta: row.precioVenta,
        precioCosto: row.precioCosto,
        medidas: row.medidas,
      }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <select className="input" value={sharedForm.color} onChange={(e) =>
            setSharedForm((prev) => ({ ...prev, color: e.target.value }))}>
            <option value="">Selecciona un color</option>
            {colorOptions.map((color) => (
              <option key={color.value} value={color.value}>{color.label}</option>
            ))}
          </select>
          <ColorSwatch colorName={sharedForm.color} />
        </div>

        <div className="flex items-center gap-3">
          <select className="input" value={sharedForm.colorSecundario} onChange={(e) =>
            setSharedForm((prev) => ({ ...prev, colorSecundario: e.target.value }))}>
            <option value="">Color secundario (opcional)</option>
            {secondaryColorOptions.map((color) => (
              <option key={color.value} value={color.value}>{color.label}</option>
            ))}
          </select>
          <ColorSwatch colorName={sharedForm.colorSecundario} />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Tallas, Precios y Medidas</p>
            <p className="text-xs text-gray-400">
              El stock físico y el costo contable oficial se gestionan mediante el módulo de Compras.
            </p>
          </div>

          <button
            type="button"
            className="btn-link text-sm"
            onClick={addSizeRow}
          >
            + Agregar talla
          </button>
        </div>

        <div className="space-y-3">
          {sizeRows.map((row, index) => {
            const rowHasMedidas = hasAnyMedida(row.medidas);
            const isExistingVariant = Boolean(row.varianteId);

            return (
              <div
                key={`${index}-${row.codigoBarra || "new"}`}
                className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-12 md:items-center">
                  {/* Selector Talla */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] text-gray-400 block mb-0.5">Talla</label>
                    <select
                      className="input w-full"
                      value={row.talla}
                      onChange={(e) => updateSizeRow(index, "talla", e.target.value)}
                    >
                      <option value="">Selecciona Talla</option>
                      {getVariantSelectOptions(row.talla, TALLA_OPTIONS).map(
                        (talla) => (
                          <option key={talla} value={talla}>
                            {talla}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Stock (Solo Lectura) */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-400 block mb-0.5">
                      {isExistingVariant ? "Stock actual" : "Stock inicial"}
                    </label>
                    <input
                      type="number"
                      className="input w-full cursor-not-allowed bg-white/5 text-gray-300 font-medium"
                      placeholder="0"
                      title={
                        isExistingVariant
                          ? "El stock disponible se gestiona desde Compras, Ventas o Ajustes"
                          : "Las nuevas variantes inician en 0. La mercadería ingresa por el módulo de Compras."
                      }
                      value={isExistingVariant ? (row.stock ?? 0) : 0}
                      disabled
                      readOnly
                    />
                  </div>

                  {/* Precio Venta Opcional */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-400 block mb-0.5">P. Venta (opc)</label>
                    <input
                      type="number"
                      className="input w-full text-xs"
                      placeholder={
                        precioBaseVenta
                          ? `P.V: Bs ${precioBaseVenta}`
                          : "P. Venta (opc)"
                      }
                      title="Precio de venta específico para esta talla (deja vacío para usar precio base)"
                      min={0}
                      step="any"
                      value={row.precioVenta ?? ""}
                      onChange={(e) =>
                        updateSizeRow(
                          index,
                          "precioVenta",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </div>

                  {/* Precio Costo (Bloqueado si existe, o referencial si es nueva) */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-400 block mb-0.5">
                      {isExistingVariant ? "🔒 Costo (CPP)" : "Costo Ref. (opc)"}
                    </label>
                    <input
                      type="number"
                      className={`input w-full text-xs ${
                        isExistingVariant ? "cursor-not-allowed bg-white/5 text-cyan-300 font-semibold" : ""
                      }`}
                      placeholder={
                        precioBaseCosto
                          ? `Cost: Bs ${precioBaseCosto}`
                          : "P. Costo"
                      }
                      title={
                        isExistingVariant
                          ? "Costo unitario oficial fijado por Compras (Solo lectura)"
                          : "Costo estimado referencial (deja vacío para usar costo base)"
                      }
                      min={0}
                      step="any"
                      disabled={isExistingVariant}
                      readOnly={isExistingVariant}
                      value={row.precioCosto ?? ""}
                      onChange={(e) =>
                        updateSizeRow(
                          index,
                          "precioCosto",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </div>

                  {/* Botón Medidas y Quitar */}
                  <div className="flex items-center gap-2 md:col-span-3 md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        updateSizeRow(index, "showMedidas", !row.showMedidas)
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                        rowHasMedidas
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
                          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                      }`}
                      title="Configurar medidas de la prenda para esta talla"
                    >
                      <span>📏</span>
                      <span>{rowHasMedidas ? "✓ Medidas" : "Medidas"}</span>
                    </button>

                    {sizeRows.length > 1 && (
                      <button
                        type="button"
                        className="btn-danger text-xs px-2.5 py-1.5"
                        onClick={() => removeSizeRow(index)}
                        title="Quitar talla"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Acordeón Desplegable de Medidas */}
                {row.showMedidas && (
                  <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-3 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-cyan-400">
                        Medidas en centímetros {row.talla ? `— Talla ${row.talla}` : ""} (opcional)
                      </p>
                      <span className="text-[11px] text-gray-400">
                        Ingresa solo las medidas que apliquen
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 text-xs">
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">
                          Pecho (axila-axila)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="input w-full pr-7 py-1 text-xs"
                            placeholder="Ej: 54"
                            value={row.medidas?.anchoPecho ?? ""}
                            onChange={(e) =>
                              updateMedidaField(index, "anchoPecho", e.target.value)
                            }
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-gray-500">
                            cm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">
                          Ancho hombros
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="input w-full pr-7 py-1 text-xs"
                            placeholder="Ej: 46"
                            value={row.medidas?.anchoHombros ?? ""}
                            onChange={(e) =>
                              updateMedidaField(index, "anchoHombros", e.target.value)
                            }
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-gray-500">
                            cm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">
                          Largo total
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="input w-full pr-7 py-1 text-xs"
                            placeholder="Ej: 70"
                            value={row.medidas?.largoTotal ?? ""}
                            onChange={(e) =>
                              updateMedidaField(index, "largoTotal", e.target.value)
                            }
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-gray-500">
                            cm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">
                          Manga (axila-puño)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="input w-full pr-7 py-1 text-xs"
                            placeholder="Ej: 52"
                            value={row.medidas?.largoMangaAxila ?? ""}
                            onChange={(e) =>
                              updateMedidaField(
                                index,
                                "largoMangaAxila",
                                e.target.value
                              )
                            }
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-gray-500">
                            cm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">
                          Manga (hombro-puño)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="input w-full pr-7 py-1 text-xs"
                            placeholder="Ej: 64"
                            value={row.medidas?.largoMangaHombro ?? ""}
                            onChange={(e) =>
                              updateMedidaField(
                                index,
                                "largoMangaHombro",
                                e.target.value
                              )
                            }
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-gray-500">
                            cm
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

      {isEdit && sizeRows.length === 1 && (
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
