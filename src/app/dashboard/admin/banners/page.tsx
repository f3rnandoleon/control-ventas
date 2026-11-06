/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { IBanner, BannerInput } from "@/types/banner";
import {
  getAdminBanners,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
} from "@/services/banner.service";
import BannerFormModal from "@/components/banners/BannerFormModal";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<IBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<IBanner | null>(null);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const data = await getAdminBanners();
      setBanners(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar la biblioteca de banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setBanners((prev) =>
        prev.map((b) => (b._id === id ? { ...b, activo: !currentStatus } : b))
      );
      const res = await toggleBannerStatus(id);
      toast.success(res.message);
    } catch {
      toast.error("No se pudo cambiar el estado del banner");
      loadBanners();
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el banner "${titulo}"?`)) return;

    try {
      setBanners((prev) => prev.filter((b) => b._id !== id));
      await deleteBanner(id);
      toast.success("Banner eliminado correctamente");
    } catch {
      toast.error("Error al eliminar banner");
      loadBanners();
    }
  };

  const handleSaveBanner = async (data: BannerInput) => {
    if (editingBanner?._id) {
      await updateBanner(editingBanner._id, data);
      toast.success("Banner actualizado correctamente");
    } else {
      await createBanner(data);
      toast.success("Nuevo banner añadido a la biblioteca");
    }
    setIsModalOpen(false);
    setEditingBanner(null);
    loadBanners();
  };

  const filteredBanners = useMemo(() => {
    if (filter === "ACTIVE") return banners.filter((b) => b.activo);
    if (filter === "INACTIVE") return banners.filter((b) => !b.activo);
    return banners;
  }, [banners, filter]);

  const activeCount = banners.filter((b) => b.activo).length;
  const inactiveCount = banners.length - activeCount;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Biblioteca de <span className="text-cyan-400">Banners Web</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestiona los banners promocionales del carrusel de inicio. Activa o desactiva campañas en 1 clic y conecta a clientes con WhatsApp (67113105).
          </p>
        </div>

        <button
          onClick={() => {
            setEditingBanner(null);
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-950/40 flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <span>+</span>
          <span>Nuevo Banner</span>
        </button>
      </div>

      {/* Métricas y Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Total Banners</p>
            <p className="text-2xl font-bold text-white mt-0.5">{banners.length}</p>
          </div>
          <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10">🖼️</span>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-semibold">Activos en la Web</p>
            <p className="text-2xl font-bold text-white mt-0.5">{activeCount}</p>
          </div>
          <span className="text-2xl p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">🟢</span>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Inactivos / Pausados</p>
            <p className="text-2xl font-bold text-white mt-0.5">{inactiveCount}</p>
          </div>
          <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10">⏸️</span>
        </div>
      </div>

      {/* Barra de Filtro de visualización */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="text-xs text-gray-400 font-semibold mr-2">Mostrar:</span>
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === "ALL"
              ? "bg-cyan-600 text-white shadow-sm"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Todos ({banners.length})
        </button>
        <button
          onClick={() => setFilter("ACTIVE")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === "ACTIVE"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Solo Activos ({activeCount})
        </button>
        <button
          onClick={() => setFilter("INACTIVE")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === "INACTIVE"
              ? "bg-gray-600 text-white shadow-sm"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Inactivos ({inactiveCount})
        </button>
      </div>

      {/* Grid de Banners */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-400 animate-pulse font-medium">
            Cargando biblioteca de banners...
          </div>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="py-20 border border-dashed border-white/15 rounded-3xl flex flex-col items-center justify-center text-center p-6 bg-white/[0.02]">
          <span className="text-4xl mb-3">🖼️</span>
          <h3 className="text-lg font-bold text-white">No hay banners que mostrar</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-md">
            {filter !== "ALL"
              ? "No tienes banners bajo este filtro. Cambia la selección o sube un nuevo banner."
              : "Comienza subiendo tus imágenes promocionales para activar el carrusel en la página de inicio."}
          </p>
          <button
            onClick={() => {
              setEditingBanner(null);
              setIsModalOpen(true);
            }}
            className="mt-4 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
          >
            + Subir Primer Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanners.map((banner) => {
            const isWa = banner.tipoAccion === "WHATSAPP";
            const waNumber = banner.whatsappNumero || "67113105";
            const fullPhone = waNumber.replace(/\D/g, "").startsWith("591")
              ? waNumber.replace(/\D/g, "")
              : `591${waNumber.replace(/\D/g, "")}`;
            const testMsg =
              banner.whatsappMensaje?.trim() ||
              `¡Hola! Vi el banner "${banner.titulo}" en su tienda web y deseo más información de las prendas.\nFoto: ${banner.imagenDesktopUrl}`;
            const testWaUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(testMsg)}`;

            return (
              <div
                key={banner._id}
                className={`group rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                  banner.activo
                    ? "bg-slate-900/70 border-cyan-500/30 hover:border-cyan-500/60 shadow-lg shadow-cyan-950/20"
                    : "bg-slate-900/40 border-white/5 opacity-70 hover:opacity-100"
                }`}
              >
                {/* Imagen del Banner */}
                <div className="relative aspect-[16/8] w-full bg-black/60 overflow-hidden">
                  <img
                    src={banner.imagenDesktopUrl}
                    alt={banner.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Badges superiores */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/20">
                      #{banner.orden}
                    </span>
                    {banner.imagenMobileUrl && (
                      <span
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-950/80 backdrop-blur-md text-cyan-300 border border-cyan-500/30"
                        title="Tiene versión optimizada para celular"
                      >
                        📱 Móvil
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleToggle(banner._id!, banner.activo)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-md backdrop-blur-md ${
                        banner.activo
                          ? "bg-emerald-500/90 text-white hover:bg-emerald-600"
                          : "bg-slate-800/90 text-gray-300 hover:bg-slate-700"
                      }`}
                    >
                      {banner.activo ? "🟢 Activo" : "⚪ Inactivo"}
                    </button>
                  </div>
                </div>

                {/* Info y Acción */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {banner.titulo}
                    </h3>
                    {banner.descripcion && (
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {banner.descripcion}
                      </p>
                    )}

                    {/* Detalle de Acción */}
                    <div className="pt-2">
                      {isWa ? (
                        <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span>💬</span>
                            <span>WhatsApp: <strong>+{fullPhone}</strong></span>
                          </span>
                          <a
                            href={testWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-[11px] hover:text-emerald-200"
                          >
                            Probar link ↗
                          </a>
                        </div>
                      ) : banner.tipoAccion === "URL_EXTERNA" ? (
                        <div className="text-xs p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 truncate">
                          🔗 Link: <span className="font-mono text-[11px]">{banner.enlaceUrl}</span>
                        </div>
                      ) : (
                        <div className="text-xs p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400">
                          🚫 Solo visual (sin redirección)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Edición y Eliminación */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggle(banner._id!, banner.activo)}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      {banner.activo ? "Desactivar de la web" : "Activar en la web"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingBanner(banner);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-300 hover:text-cyan-300 hover:bg-white/10 rounded-xl transition-all"
                        title="Editar banner"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleDelete(banner._id!, banner.titulo)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Eliminar banner"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <BannerFormModal
          banner={editingBanner}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBanner(null);
          }}
          onSave={handleSaveBanner}
        />
      )}
    </div>
  );
}

