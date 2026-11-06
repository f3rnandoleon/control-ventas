/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { IBanner, BannerInput } from "@/types/banner";
import { uploadBannerImage } from "@/services/banner.service";

interface Props {
  banner?: IBanner | null;
  onClose: () => void;
  onSave: (data: BannerInput) => Promise<void>;
}

export default function BannerFormModal({ banner, onClose, onSave }: Props) {
  const [titulo, setTitulo] = useState(banner?.titulo || "");
  const [descripcion, setDescripcion] = useState(banner?.descripcion || "");
  const [imagenDesktopUrl, setImagenDesktopUrl] = useState(banner?.imagenDesktopUrl || "");
  const [imagenMobileUrl, setImagenMobileUrl] = useState(banner?.imagenMobileUrl || "");
  const [tipoAccion, setTipoAccion] = useState<"WHATSAPP" | "URL_EXTERNA" | "NINGUNA">(
    banner?.tipoAccion || "WHATSAPP"
  );
  const [whatsappNumero, setWhatsappNumero] = useState(banner?.whatsappNumero || "67113105");
  const [whatsappMensaje, setWhatsappMensaje] = useState(banner?.whatsappMensaje || "");
  const [enlaceUrl, setEnlaceUrl] = useState(banner?.enlaceUrl || "");
  const [activo, setActivo] = useState(banner?.activo ?? true);
  const [orden, setOrden] = useState(banner?.orden ?? 0);
  const [fechaInicio, setFechaInicio] = useState(
    banner?.fechaInicio ? new Date(banner.fechaInicio).toISOString().slice(0, 16) : ""
  );
  const [fechaFin, setFechaFin] = useState(
    banner?.fechaFin ? new Date(banner.fechaFin).toISOString().slice(0, 16) : ""
  );

  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File, isDesktop: boolean) => {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede pesar más de 5 MB");
      return;
    }

    if (isDesktop) setUploadingDesktop(true);
    else setUploadingMobile(true);

    try {
      const url = await uploadBannerImage(file);
      if (isDesktop) {
        setImagenDesktopUrl(url);
        toast.success("Imagen desktop subida a Cloudinary");
      } else {
        setImagenMobileUrl(url);
        toast.success("Imagen mobile subida a Cloudinary");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al subir la imagen";
      toast.error(msg);
    } finally {
      if (isDesktop) setUploadingDesktop(false);
      else setUploadingMobile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    if (!imagenDesktopUrl.trim()) {
      toast.error("Debes subir o ingresar la imagen principal (desktop)");
      return;
    }

    if (tipoAccion === "URL_EXTERNA" && !enlaceUrl.trim()) {
      toast.error("Ingresa la URL del enlace");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        imagenDesktopUrl: imagenDesktopUrl.trim(),
        imagenMobileUrl: imagenMobileUrl.trim() || undefined,
        tipoAccion,
        whatsappNumero: tipoAccion === "WHATSAPP" ? whatsappNumero.trim() || "67113105" : undefined,
        whatsappMensaje: tipoAccion === "WHATSAPP" ? whatsappMensaje.trim() || undefined : undefined,
        enlaceUrl: tipoAccion === "URL_EXTERNA" ? enlaceUrl.trim() : undefined,
        activo,
        orden: Number(orden) || 0,
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : undefined,
        fechaFin: fechaFin ? new Date(fechaFin).toISOString() : undefined,
      });
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al guardar banner";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const defaultWhatsappPreview =
    whatsappMensaje.trim() ||
    `¡Hola! Vi el banner "${titulo || "Promoción"}" en su tienda web y deseo más información de las prendas.\nFoto: ${imagenDesktopUrl || "[URL de la imagen]"}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-lg">
              🖼️
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {banner ? "Editar Banner Web" : "Nuevo Banner para Carrusel"}
              </h2>
              <p className="text-xs text-gray-400">
                Configura la imagen, el orden y la acción de WhatsApp (67113105).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto">
          
          {/* Título y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-300 mb-1.5 block">
                Título o Campaña <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Nueva Colección Invierno 2026 / 20% OFF en Poleras"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-cyan-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1.5 block">
                Orden de Aparición
              </label>
              <input
                type="number"
                min="0"
                value={orden}
                onChange={(e) => setOrden(parseInt(e.target.value) || 0)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none font-mono"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Menor número = primero</span>
            </div>
          </div>

          {/* Descripción opcional */}
          <div>
            <label className="text-xs font-semibold text-gray-300 mb-1.5 block">
              Descripción o Subtítulo (Opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Prendas térmicas de alpaca con despacho inmediato a todo el país."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:border-cyan-500 outline-none"
            />
          </div>

          {/* Subida de Imagen Principal (Desktop) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 block">
              Imagen Principal (Desktop / Horizontal) <span className="text-cyan-400">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <input
                type="file"
                ref={desktopInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, true);
                }}
              />

              <button
                type="button"
                onClick={() => desktopInputRef.current?.click()}
                disabled={uploadingDesktop}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-cyan-500/40 text-cyan-300 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
              >
                {uploadingDesktop ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Subiendo a Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>Subir imagen desde equipo</span>
                  </>
                )}
              </button>

              <input
                type="url"
                value={imagenDesktopUrl}
                onChange={(e) => setImagenDesktopUrl(e.target.value)}
                placeholder="O pega aquí la URL directa de la imagen (Cloudinary / CDN)..."
                className="flex-1 w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-cyan-500 outline-none font-mono"
              />
            </div>

            {/* Vista previa Desktop */}
            {imagenDesktopUrl && (
              <div className="relative mt-2 rounded-2xl overflow-hidden border border-white/15 bg-black/40 max-h-48 group">
                <img
                  src={imagenDesktopUrl}
                  alt="Vista previa desktop"
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagenDesktopUrl("")}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg text-xs transition-colors"
                  title="Quitar imagen"
                >
                  ✕ Quitar
                </button>
              </div>
            )}
          </div>

          {/* Subida de Imagen Opcional (Mobile) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 block">
                Imagen para Celular / Vertical (Opcional)
              </label>
              <span className="text-[10px] text-gray-400">Si se omite, se adapta la desktop</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <input
                type="file"
                ref={mobileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, false);
                }}
              />

              <button
                type="button"
                onClick={() => mobileInputRef.current?.click()}
                disabled={uploadingMobile}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
              >
                {uploadingMobile ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Subiendo a Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <span>📱</span>
                    <span>Subir versión móvil</span>
                  </>
                )}
              </button>

              <input
                type="url"
                value={imagenMobileUrl}
                onChange={(e) => setImagenMobileUrl(e.target.value)}
                placeholder="O URL directa para celular (ej: formato 1:1 o 4:5)..."
                className="flex-1 w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-cyan-500 outline-none font-mono"
              />
            </div>

            {imagenMobileUrl && (
              <div className="relative mt-2 rounded-2xl overflow-hidden border border-white/15 bg-black/40 w-32 h-40 group">
                <img
                  src={imagenMobileUrl}
                  alt="Vista previa mobile"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagenMobileUrl("")}
                  className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded text-[10px] transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Configuración de Acción al Clic (WhatsApp al 67113105) */}
          <div className="bg-white/[0.04] border border-cyan-500/30 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <h4 className="text-xs uppercase font-bold tracking-wider text-cyan-300">
                  Acción al Hacer Clic en el Banner
                </h4>
              </div>
              <span className="text-[11px] text-gray-400">Interacción del cliente</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  tipoAccion === "WHATSAPP"
                    ? "bg-emerald-500/15 border-emerald-500/50 text-white"
                    : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="tipoAccion"
                  value="WHATSAPP"
                  checked={tipoAccion === "WHATSAPP"}
                  onChange={() => setTipoAccion("WHATSAPP")}
                  className="accent-emerald-500"
                />
                <div>
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span>💬</span> WhatsApp Directo
                  </p>
                  <p className="text-[10px] text-gray-400">Al 67113105 con datos</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  tipoAccion === "URL_EXTERNA"
                    ? "bg-cyan-500/15 border-cyan-500/50 text-white"
                    : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="tipoAccion"
                  value="URL_EXTERNA"
                  checked={tipoAccion === "URL_EXTERNA"}
                  onChange={() => setTipoAccion("URL_EXTERNA")}
                  className="accent-cyan-500"
                />
                <div>
                  <p className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                    <span>🔗</span> Enlace Web
                  </p>
                  <p className="text-[10px] text-gray-400">Catálogo o producto</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  tipoAccion === "NINGUNA"
                    ? "bg-white/15 border-white/40 text-white"
                    : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="tipoAccion"
                  value="NINGUNA"
                  checked={tipoAccion === "NINGUNA"}
                  onChange={() => setTipoAccion("NINGUNA")}
                  className="accent-white"
                />
                <div>
                  <p className="text-xs font-bold text-gray-300 flex items-center gap-1">
                    <span>🚫</span> Sin Enlace
                  </p>
                  <p className="text-[10px] text-gray-400">Solo visual</p>
                </div>
              </label>
            </div>

            {/* Opciones cuando es WHATSAPP */}
            {tipoAccion === "WHATSAPP" && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-300 mb-1 block">
                      Número de WhatsApp
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={whatsappNumero}
                        onChange={(e) => setWhatsappNumero(e.target.value)}
                        placeholder="67113105"
                        className="w-full bg-black/50 border border-white/15 rounded-xl pl-16 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                      />
                      <span className="absolute left-3 top-2 text-xs font-bold text-emerald-400">
                        +591
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-300 mb-1 block">
                      Mensaje Personalizado (Opcional)
                    </label>
                    <input
                      type="text"
                      value={whatsappMensaje}
                      onChange={(e) => setWhatsappMensaje(e.target.value)}
                      placeholder="Dejar vacío para usar mensaje automático"
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Previsualización del mensaje */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                  <span className="text-sm">👁️</span>
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-200">Mensaje que recibirá tu WhatsApp:</p>
                    <p className="text-[11px] text-emerald-100/80 italic font-mono whitespace-pre-wrap">
                      &quot;{defaultWhatsappPreview}&quot;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Opciones cuando es URL_EXTERNA */}
            {tipoAccion === "URL_EXTERNA" && (
              <div>
                <label className="text-[11px] font-semibold text-gray-300 mb-1 block">
                  URL de Destino
                </label>
                <input
                  type="text"
                  value={enlaceUrl}
                  onChange={(e) => setEnlaceUrl(e.target.value)}
                  placeholder="/productos?categoria=poleras o https://tienda.com/..."
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Fechas de Vigencia y Toggle Activo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">
                Fecha Inicio (Opcional)
              </label>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">
                Fecha Fin / Límite (Opcional)
              </label>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 p-2.5 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded"
                />
                <span className="text-xs font-bold text-white">
                  {activo ? "🟢 Banner Activo" : "⚪ Guardar Inactivo"}
                </span>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <footer className="p-4 border-t border-white/10 flex items-center justify-end gap-3 bg-black/40">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-cyan-950/40"
          >
            {submitting ? "Guardando..." : banner ? "Actualizar Banner" : "Guardar en Biblioteca"}
          </button>
        </footer>
      </div>
    </div>
  );
}

