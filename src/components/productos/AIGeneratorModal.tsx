/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TipoModeloBase } from "@/models/modeloBase";
import {
  PLANTILLAS_CATALOGO,
  PlantillaGeneracionId,
  INFO_TIPOS_MODELO,
  resolvePosesForTemplate,
} from "@/constants/modelos-base";
import {
  detectVariantColors,
  generateVariantPhotos,
} from "@/services/ai-catalog.service";
import { GeneratedCatalogPhoto } from "@/services/ai-vton.service";
import BibliotecaModelosModal from "@/components/modelos-base/BibliotecaModelosModal";
import ColorSwatch from "@/components/ui/ColorSwatch";

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  garmentImageUrl: string;
  variantIndex?: number;
  onApplyColors: (color: string, colorSecundario?: string) => void;
  onAddImages: (imageUrls: string[]) => void;
}

export default function AIGeneratorModal({
  isOpen,
  onClose,
  garmentImageUrl,
  variantIndex = 0,
  onApplyColors,
  onAddImages,
}: AIGeneratorModalProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<PlantillaGeneracionId>("UNISEX_ADULTO");
  const [currentVariantIndex, setCurrentVariantIndex] =
    useState<number>(variantIndex);
  const [customPoses, setCustomPoses] = useState<TipoModeloBase[]>([
    "VARON",
    "COLGADOR",
    "MUJER",
    "CLOSE_UP",
  ]);

  // Estados de detección de color
  const [detectingColors, setDetectingColors] = useState(false);
  const [detectedColors, setDetectedColors] = useState<{
    colorPrincipal?: string;
    colorSecundario?: string;
  } | null>(null);

  // Estados de generación de fotos
  const [generatingPhotos, setGeneratingPhotos] = useState(false);
  const [generatedPhotos, setGeneratedPhotos] = useState<GeneratedCatalogPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  // Modal de biblioteca de modelos
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  if (!isOpen) return null;

  const currentConfig = PLANTILLAS_CATALOGO.find(
    (p) => p.id === selectedTemplate
  );

  const previewPoses = resolvePosesForTemplate(
    selectedTemplate,
    currentVariantIndex,
    customPoses
  );

  const handleDetectColors = async () => {
    if (!garmentImageUrl) {
      toast.error("Debes tener al menos una imagen de la prenda cargada");
      return;
    }

    try {
      setDetectingColors(true);
      toast.loading("Analizando prenda con Gemini AI...", { id: "detect-color" });

      const res = await detectVariantColors(garmentImageUrl);

      setDetectedColors({
        colorPrincipal: res.colorPrincipal,
        colorSecundario: res.colorSecundario,
      });

      toast.success(
        `Color detectado: ${res.colorPrincipal}${
          res.colorSecundario ? ` y ${res.colorSecundario}` : ""
        }`,
        { id: "detect-color" }
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al detectar colores",
        { id: "detect-color" }
      );
    } finally {
      setDetectingColors(false);
    }
  };

  const handleApplyColors = () => {
    if (!detectedColors?.colorPrincipal) return;
    onApplyColors(
      detectedColors.colorPrincipal,
      detectedColors.colorSecundario
    );
    toast.success("Colores aplicados a la variante");
  };

  const handleGeneratePhotos = async () => {
    if (!garmentImageUrl) {
      toast.error("Selecciona o sube una imagen de la prenda");
      return;
    }

    try {
      setGeneratingPhotos(true);
      toast.loading("Generando catálogo con IA y Cloudinary...", {
        id: "generate-photos",
      });

      const photos = await generateVariantPhotos({
        garmentImageUrl,
        templateId: selectedTemplate,
        variantIndex: currentVariantIndex,
        customPoses: selectedTemplate === "MANUAL" ? customPoses : undefined,
      });

      setGeneratedPhotos(photos);
      setSelectedPhotos(new Set(photos.map((p) => p.url)));

      toast.success(`¡${photos.length} fotos generadas exitosamente!`, {
        id: "generate-photos",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al generar fotos de catálogo",
        { id: "generate-photos" }
      );
    } finally {
      setGeneratingPhotos(false);
    }
  };

  const toggleSelectPhoto = (url: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleConfirmAddImages = () => {
    const urls = Array.from(selectedPhotos);
    if (urls.length === 0) {
      toast.error("Selecciona al menos una foto para agregar");
      return;
    }
    onAddImages(urls);
    toast.success(`Se agregaron ${urls.length} imágenes a la variante`);
    onClose();
  };

  const toggleCustomPose = (pose: TipoModeloBase) => {
    setCustomPoses((prev) =>
      prev.includes(pose) ? prev.filter((p) => p !== pose) : [...prev, pose]
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Estudio Fotográfico IA & Detección de Color</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-black">
                    Gemini + VTON
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Detección de tonos de tela y producción de fotos comerciales para Cloudinary y tu web.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Fila Prenda Base & Detección de Colores */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-2xl border border-white/10 bg-black/30 p-4">
              {/* Imagen Prenda */}
              <div className="md:col-span-3 flex items-center gap-3">
                <div className="relative aspect-square w-24 rounded-xl overflow-hidden border border-white/20 bg-black/50 shrink-0">
                  {garmentImageUrl ? (
                    <img
                      src={garmentImageUrl}
                      alt="Prenda base"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                      Sin foto
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                    Prenda Base
                  </span>
                  <p className="text-xs text-white font-medium">Foto de variante</p>
                </div>
              </div>

              {/* Botón y Resultado Gemini */}
              <div className="md:col-span-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-4 pt-3 sm:pt-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Detección de Color con Gemini:
                    </span>
                    {detectedColors && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-white font-medium">
                          <ColorSwatch colorName={detectedColors.colorPrincipal || ""} />
                          {detectedColors.colorPrincipal}
                        </span>
                        {detectedColors.colorSecundario && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-gray-300 font-medium">
                            <ColorSwatch colorName={detectedColors.colorSecundario} />
                            Secundario: {detectedColors.colorSecundario}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Gemini analiza la prenda y selecciona automáticamente entre las 91 opciones oficiales del sistema.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDetectColors}
                    disabled={detectingColors || !garmentImageUrl}
                    className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>{detectingColors ? "Analizando..." : "🔍 Detectar Color"}</span>
                  </button>

                  {detectedColors && (
                    <button
                      type="button"
                      onClick={handleApplyColors}
                      className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>✓ Aplicar Colores</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Configuración de Plantilla & Alternación */}
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📐</span> Plantilla de Catálogo Comercial
                  </h3>
                  <p className="text-xs text-gray-400">
                    Elige la composición fotográfica preestablecida o selecciona poses manualmente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>🏛️</span> Biblioteca de Modelos
                </button>
              </div>

              {/* Selector de Plantilla */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {PLANTILLAS_CATALOGO.map((plantilla) => {
                  const isSelected = selectedTemplate === plantilla.id;
                  return (
                    <button
                      key={plantilla.id}
                      type="button"
                      onClick={() => setSelectedTemplate(plantilla.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">
                          {plantilla.nombre}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-gray-300">
                          {plantilla.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">
                        {plantilla.descripcion}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Indicador de Variante (para alternar 1ra foto en Unisex y Tradicional) */}
              {currentConfig?.esIntercalada && (
                <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-cyan-300">
                      Regla de Alternación Activa:
                    </span>
                    <p className="text-[11px] text-gray-400">
                      Intercala automáticamente el orden principal para que en la web se vea variedad dinámica.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-300">Índice variante:</label>
                    <select
                      className="input py-1 px-2 text-xs"
                      value={currentVariantIndex}
                      onChange={(e) => setCurrentVariantIndex(Number(e.target.value))}
                    >
                      <option value={0}>Variante #1 (Varón / Pollera 1°)</option>
                      <option value={1}>Variante #2 (Mujer 1°)</option>
                      <option value={2}>Variante #3 (Varón / Pollera 1°)</option>
                      <option value={3}>Variante #4 (Mujer 1°)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Modo Manual: Checkboxes de Poses */}
              {selectedTemplate === "MANUAL" && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-xs font-semibold text-gray-300">
                    Selecciona las poses que deseas generar:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {Object.values(INFO_TIPOS_MODELO).map((info) => {
                      const isChecked = customPoses.includes(info.tipo);
                      return (
                        <label
                          key={info.tipo}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "border-cyan-500/50 bg-cyan-950/30 text-white"
                              : "border-white/10 bg-black/20 text-gray-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCustomPose(info.tipo)}
                            className="rounded border-white/20 text-cyan-500 focus:ring-0"
                          />
                          <span>{info.icono}</span>
                          <span className="truncate">{info.nombre.split(" ")[0]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vista Previa del Orden de Poses */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Secuencia de Fotos a Generar ({previewPoses.length}):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {previewPoses.map((pose, idx) => {
                    const info = INFO_TIPOS_MODELO[pose];
                    return (
                      <div
                        key={`${pose}-${idx}`}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                      >
                        <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                        <span>{info?.icono}</span>
                        <span className="font-medium">{info?.nombre}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Botón de Ejecución de Generación */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGeneratePhotos}
                disabled={generatingPhotos || !garmentImageUrl}
                className="btn-primary px-8 py-3 text-sm font-bold flex items-center gap-3 shadow-xl shadow-cyan-500/20"
              >
                <span>{generatingPhotos ? "⏳ Procesando Fotos con IA..." : "🚀 Generar Fotos para Web y Cloudinary"}</span>
              </button>
            </div>

            {/* Galería de Resultados Generados */}
            {generatedPhotos.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎉</span> Fotos Generadas Listas para Cloudinary
                    </h3>
                    <p className="text-xs text-gray-400">
                      Selecciona las fotos que deseas incorporar permanentemente a esta variante.
                    </p>
                  </div>
                  <span className="text-xs text-cyan-400 font-semibold">
                    {selectedPhotos.size} de {generatedPhotos.length} seleccionadas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {generatedPhotos.map((photo, idx) => {
                    const isSelected = selectedPhotos.has(photo.url);
                    return (
                      <div
                        key={`${photo.url}-${idx}`}
                        onClick={() => toggleSelectPhoto(photo.url)}
                        className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? "border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/10"
                            : "border-white/10 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {/* Checkbox badge */}
                        <div className="absolute top-2 right-2 z-10">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                              isSelected
                                ? "bg-cyan-500 text-black"
                                : "bg-black/60 text-white border border-white/30"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                        </div>

                        {/* Pose badge */}
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1 border border-white/10">
                          <span>{photo.icono}</span>
                          <span>{photo.nombrePose}</span>
                        </div>

                        <div className="relative aspect-[3/4] w-full bg-black/40">
                          <img
                            src={photo.url}
                            alt={photo.nombrePose}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="p-2 bg-white/5 flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">{photo.generadoPor}</span>
                          <span className="text-cyan-300 font-medium">Foto #{idx + 1}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={handleConfirmAddImages}
                    className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2"
                  >
                    <span>✅ Agregar ({selectedPhotos.size}) Fotos a la Variante</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-3 bg-white/[0.02]">
            <p className="text-xs text-gray-500">
              Las fotos aprobadas se asocian de inmediato a la variante en Cloudinary.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-5 py-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Biblioteca de Modelos */}
      <BibliotecaModelosModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
      />
    </>
  );
}

