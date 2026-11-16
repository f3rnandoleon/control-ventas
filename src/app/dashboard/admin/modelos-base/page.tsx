/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { TipoModeloBase, IModeloBase } from "@/models/modeloBase";
import { INFO_TIPOS_MODELO } from "@/constants/modelos-base";
import {
  getModelosBase,
  createModeloBase,
  updateModeloBase,
  deleteModeloBase,
  uploadModeloBaseImage,
} from "@/services/ai-catalog.service";

export default function AdminModelosBasePage() {
  const [modelos, setModelos] = useState<IModeloBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("TODOS");
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Form states
  const [newTipo, setNewTipo] = useState<TipoModeloBase>("VARON");
  const [newNombre, setNewNombre] = useState("");
  const [newDescripcion, setNewDescripcion] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDefaultCheckbox, setIsDefaultCheckbox] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchModelos = async () => {
    try {
      setLoading(true);
      const data = await getModelosBase();
      setModelos(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cargar biblioteca de modelos"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelos();
  }, []);

  const handleSetDefault = async (modelo: IModeloBase) => {
    if (!modelo._id) return;
    try {
      await updateModeloBase(modelo._id, { esDefault: true });
      toast.success(
        `"${modelo.nombre}" ahora es el modelo predeterminado para ${INFO_TIPOS_MODELO[modelo.tipo]?.nombre}`
      );
      await fetchModelos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar");
    }
  };

  const handleDelete = async (modelo: IModeloBase) => {
    if (!modelo._id) return;
    if (!confirm(`¿Eliminar el modelo "${modelo.nombre}"?`)) return;

    try {
      await deleteModeloBase(modelo._id);
      toast.success("Modelo eliminado");
      await fetchModelos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!newNombre) {
        setNewNombre(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Selecciona una fotografía del modelo");
      return;
    }
    if (!newNombre.trim()) {
      toast.error("Ingresa un nombre para el modelo");
      return;
    }

    try {
      setSubmitting(true);
      toast.loading("Subiendo modelo a Cloudinary...", { id: "upload-model" });

      const uploadedUrl = await uploadModeloBaseImage(selectedFile);

      toast.loading("Registrando modelo en catálogo...", { id: "upload-model" });
      await createModeloBase({
        tipo: newTipo,
        nombre: newNombre.trim(),
        descripcion: newDescripcion.trim() || undefined,
        imagenUrl: uploadedUrl,
        esDefault: isDefaultCheckbox,
      });

      toast.success("¡Modelo registrado con éxito!", { id: "upload-model" });
      setShowUploadForm(false);
      setSelectedFile(null);
      setPreviewUrl("");
      setNewNombre("");
      setNewDescripcion("");
      await fetchModelos();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al registrar modelo",
        { id: "upload-model" }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredModelos =
    selectedFilter === "TODOS"
      ? modelos
      : modelos.filter((m) => m.tipo === selectedFilter);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏛️</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Biblioteca de Modelos Base para IA
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Gestiona los modelos masculinos, femeninos, tradicionales de pollera, infantiles y maniquíes usados para generar fotos comerciales con IA.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/productos"
            className="btn-secondary text-xs px-3 py-2"
          >
            ← Volver a Productos
          </Link>
          <button
            type="button"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="btn-primary text-xs flex items-center gap-2 px-4 py-2"
          >
            <span>{showUploadForm ? "✕ Cancelar" : "+ Subir Nuevo Modelo"}</span>
          </button>
        </div>
      </div>

      {/* Formulario de Subida Desplegable */}
      {showUploadForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5 space-y-4 animate-in slide-in-from-top-4 duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <span>📸</span> Subir Fotografía de Modelo a Cloudinary
            </h3>
            <span className="text-xs text-gray-400">
              Usa fotos nítidas con fondo de estudio uniforme
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-300 block mb-1">
                Tipo de Pose / Categoría <span className="text-red-400">*</span>
              </label>
              <select
                className="input w-full text-xs"
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value as TipoModeloBase)}
              >
                {Object.values(INFO_TIPOS_MODELO).map((info) => (
                  <option key={info.tipo} value={info.tipo}>
                    {info.icono} {info.nombre}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                {INFO_TIPOS_MODELO[newTipo]?.descripcion}
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">
                Nombre del Modelo o Pose <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="input w-full text-xs"
                placeholder="Ej: Rodrigo - Varón Deportivo Estudio"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">
                Archivo de Imagen <span className="text-red-400">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                className="input w-full text-xs"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {previewUrl && (
            <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/10">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-16 h-20 object-cover rounded-lg border border-white/20"
              />
              <div>
                <p className="text-xs font-semibold text-white">Archivo seleccionado listo para subir</p>
                <p className="text-[11px] text-gray-400">{selectedFile?.name}</p>
                <label className="flex items-center gap-2 text-xs text-cyan-300 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefaultCheckbox}
                    onChange={(e) => setIsDefaultCheckbox(e.target.checked)}
                    className="rounded border-white/20 text-cyan-500 focus:ring-0"
                  />
                  <span>Establecer automáticamente como modelo predeterminado</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="btn-secondary text-xs px-4 py-2"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? "Subiendo a Cloudinary..." : "Guardar en la Biblioteca"}
            </button>
          </div>
        </form>
      )}

      {/* Barra de Filtros por Categoría */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          type="button"
          onClick={() => setSelectedFilter("TODOS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedFilter === "TODOS"
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          }`}
        >
          Todos los Modelos ({modelos.length})
        </button>
        {Object.values(INFO_TIPOS_MODELO).map((info) => {
          const count = modelos.filter((m) => m.tipo === info.tipo).length;
          return (
            <button
              key={info.tipo}
              type="button"
              onClick={() => setSelectedFilter(info.tipo)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedFilter === info.tipo
                  ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <span>{info.icono}</span>
              <span>{info.nombre}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid de Modelos */}
      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">
          Cargando biblioteca de modelos...
        </div>
      ) : filteredModelos.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">
          No hay modelos registrados para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredModelos.map((modelo) => {
            const info = INFO_TIPOS_MODELO[modelo.tipo];
            return (
              <div
                key={modelo._id || modelo.nombre}
                className={`group relative rounded-2xl border overflow-hidden transition-all duration-200 bg-white/5 flex flex-col ${
                  modelo.esDefault
                    ? "border-cyan-400/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* Badge Predeterminado */}
                {modelo.esDefault && (
                  <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-bold shadow-md">
                    ★ Predeterminado
                  </span>
                )}

                {/* Imagen */}
                <div className="relative aspect-[3/4] w-full bg-black/40 overflow-hidden">
                  <img
                    src={modelo.imagenUrl}
                    alt={modelo.nombre}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
                      <span>{info?.icono}</span>
                      <span>{info?.nombre.split(" ")[0]}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-white line-clamp-1" title={modelo.nombre}>
                      {modelo.nombre}
                    </h4>
                  </div>

                  {/* Acciones */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1">
                    {!modelo.esDefault ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(modelo)}
                        className="text-[11px] text-cyan-300 hover:text-cyan-200 hover:underline font-medium"
                      >
                        Hacer predeterminado
                      </button>
                    ) : (
                      <span className="text-[11px] text-cyan-400 font-semibold">
                        ✓ En uso oficial
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(modelo)}
                      className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors text-xs"
                      title="Eliminar modelo"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

