"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { MedidaTallaItem, Variante } from "@/types/producto";
import { uploadVarianteImages } from "@/services/upload.service";
import { getVarianteImagenes } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import {
  ColorOption,
  TALLA_OPTIONS,
  getColorOptions,
  getVariantSelectOptions,
} from "@/constants/variant-options";
import ColorSwatch from "@/components/ui/ColorSwatch";
import AIGeneratorModal from "@/components/productos/AIGeneratorModal";
import { detectVariantColors } from "@/services/ai-catalog.service";

type VarianteTallaForm = {
  varianteId?: string;
  talla: string;
  stock: number;
  codigoBarra?: string;
  qrCode?: string;
  precioVenta?: number | "";
  precioCosto?: number | "";
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
});

const normalizeVariantKey = (
  color: string,
  colorSecundario: string | undefined,
  talla: string
) =>
  `${color.trim().toLowerCase()}::${(colorSecundario || "").trim().toLowerCase()}::${talla.trim().toLowerCase()}`;

const renderGroupedColorOptions = (options: ColorOption[]) => {
  const groups: Record<string, ColorOption[]> = {};
  for (const opt of options) {
    const fam = opt.family || "Otros";
    if (!groups[fam]) groups[fam] = [];
    groups[fam].push(opt);
  }

  return Object.entries(groups).map(([family, items]) => (
    <optgroup key={family} label={`── ${family} ──`} className="bg-slate-900 text-cyan-400 font-semibold">
      {items.map((color) => (
        <option key={color.value} value={color.value} className="bg-slate-900 text-white font-normal">
          {color.label}
        </option>
      ))}
    </optgroup>
  ));
};

export default function VarianteForm({
  initialData,
  initialVariantes,
  existingVariantes = [],
  medidasPorTalla = [],
  precioBaseVenta,
  precioBaseCosto,
  onSave,
  onCancel,
}: {
  initialData?: Variante;
  initialVariantes?: Variante[];
  existingVariantes?: Variante[];
  medidasPorTalla?: MedidaTallaItem[];
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
      }));
    }

    return [createEmptySizeRow()];
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [detectingColorsDirectly, setDetectingColorsDirectly] = useState(false);
  const isEdit = editingVariantes.length > 0;
  const colorOptions = getColorOptions(sharedForm.color);
  const secondaryColorOptions = getColorOptions(sharedForm.colorSecundario);

  const handleDirectDetectColors = async () => {
    const firstImage = sharedForm.imagenes?.[0];
    if (!firstImage) {
      toast.error("Sube primero una imagen de la prenda para detectar sus colores");
      return;
    }

    try {
      setDetectingColorsDirectly(true);
      toast.loading("Analizando prenda con Gemini AI...", { id: "detect-colors-direct" });
      const res = await detectVariantColors(firstImage);
      setSharedForm((prev) => ({
        ...prev,
        color: res.colorPrincipal,
        colorSecundario: res.colorSecundario || "",
      }));
      toast.success(
        `Color detectado: ${res.colorPrincipal}${
          res.colorSecundario ? ` | Secundario: ${res.colorSecundario}` : ""
        }`,
        { id: "detect-colors-direct" }
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al detectar colores con IA",
        { id: "detect-colors-direct" }
      );
    } finally {
      setDetectingColorsDirectly(false);
    }
  };

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

  const addSizeRow = () => {
    setSizeRows((prev) => [...prev, createEmptySizeRow()]);
  };

  const removeSizeRow = (index: number) => {
    setSizeRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const getGuiaMedidaParaTalla = (talla: string) => {
    const norm = talla.trim().toLowerCase();
    if (!norm) return undefined;
    return medidasPorTalla.find((m) => m.talla.trim().toLowerCase() === norm);
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
      }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-300">
          Colores de la Variante
        </label>
        {(sharedForm.imagenes?.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={handleDirectDetectColors}
            disabled={detectingColorsDirectly}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>✨</span>
            <span>
              {detectingColorsDirectly
                ? "Detectando con Gemini..."
                : "Detectar colores con Gemini IA"}
            </span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <select className="input" value={sharedForm.color} onChange={(e) =>
            setSharedForm((prev) => ({ ...prev, color: e.target.value }))}>
            <option value="">Selecciona un color</option>
            {renderGroupedColorOptions(colorOptions)}
          </select>
          <ColorSwatch colorName={sharedForm.color} />
        </div>

        <div className="flex items-center gap-3">
          <select className="input" value={sharedForm.colorSecundario} onChange={(e) =>
            setSharedForm((prev) => ({ ...prev, colorSecundario: e.target.value }))}>
            <option value="">Color secundario (opcional)</option>
            {renderGroupedColorOptions(secondaryColorOptions)}
          </select>
          <ColorSwatch colorName={sharedForm.colorSecundario} />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Tallas y Precios</p>
            <p className="text-xs text-gray-400">
              El stock y costo oficial (CPP) se gestionan en Compras. Las medidas en cm se configuran una sola vez por talla en{" "}
              <span className="text-cyan-400 font-semibold">📏 Guía de tallas</span> del producto.
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
            const guiaMedida = getGuiaMedidaParaTalla(row.talla);
            const isExistingVariant = Boolean(row.varianteId);

            return (
              <div
                key={`${index}-${row.codigoBarra || "new"}`}
                className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
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

                  {/* Estado Guía de Tallas y Quitar */}
                  <div className="flex items-center gap-2 md:col-span-3 md:justify-end">
                    {row.talla && (
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${
                          guiaMedida
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                            : "bg-white/5 text-gray-400 border-white/10"
                        }`}
                        title={
                          guiaMedida
                            ? `Medidas de la guía del producto para talla ${row.talla}`
                            : "Configura las medidas en '📏 Guía de tallas' del producto"
                        }
                      >
                        {guiaMedida ? "📏 Con medidas" : "📏 Sin guía"}
                      </span>
                    )}

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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="label mb-0">Imágenes de la variante</label>
          {(sharedForm.imagenes?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setIsAIModalOpen(true)}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>✨</span>
              <span>Abrir Estudio Fotográfico IA</span>
            </button>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          className="input"
          onChange={handleImageUpload}
          disabled={uploadingImage}
        />
        {uploadingImage && (
          <p className="text-sm text-gray-400">Subiendo imagenes a Cloudinary...</p>
        )}

        {(sharedForm.imagenes?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-black/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Estudio Fotográfico & Catálogo con IA</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-500 text-black">
                    VTON + GEMINI
                  </span>
                </p>
                <p className="text-[11px] text-gray-300">
                  Genera fotos comerciales (Varón, Mujer, Colgador, Close-up, Tradicional de Pollera) listas para la web y Cloudinary.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAIModalOpen(true)}
              className="btn-primary text-xs px-4 py-2 font-bold flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-cyan-500/20"
            >
              <span>✨ Generar Fotos con IA</span>
            </button>
          </div>
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

      <AIGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        garmentImageUrl={sharedForm.imagenes?.[0] || ""}
        variantIndex={existingVariantes.length}
        onApplyColors={(color, sec) =>
          setSharedForm((prev) => ({
            ...prev,
            color,
            colorSecundario: sec || "",
          }))
        }
        onAddImages={(newUrls) =>
          setSharedForm((prev) => ({
            ...prev,
            imagenes: [...new Set([...(prev.imagenes || []), ...newUrls])],
          }))
        }
      />
    </div>
  );
}
