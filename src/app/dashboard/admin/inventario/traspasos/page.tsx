"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getTraspasos,
  crearTraspaso,
  despacharTraspaso,
  recibirTraspaso,
  cancelarTraspaso,
} from "@/services/traspasos.service";
import { getSucursales } from "@/services/sucursales.service";
import type { Traspaso } from "@/types/traspaso";
import type { Sucursal } from "@/types/sucursal";
import type { Producto } from "@/types/producto";
import { toast } from "sonner";

// Componentes modulares
import TraspasoKPIs from "@/components/traspasos/TraspasoKPIs";
import TraspasoTable from "@/components/traspasos/TraspasoTable";
import TraspasoCard from "@/components/traspasos/TraspasoCard";
import NuevoTraspasoModal from "@/components/traspasos/NuevoTraspasoModal";
import DetalleTraspasoModal from "@/components/traspasos/DetalleTraspasoModal";
import RecibirTraspasoModal from "@/components/traspasos/RecibirTraspasoModal";
import GuiaTraspasoPrintModal from "@/components/traspasos/GuiaTraspasoPrintModal";

export default function TraspasosPage() {
  const [traspasos, setTraspasos] = useState<Traspaso[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros y Vista
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState<string>("TODAS");
  const [viewMode, setViewMode] = useState<"auto" | "table" | "grid">("auto");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTraspaso, setSelectedTraspaso] = useState<Traspaso | null>(null);
  const [receiveModalTraspaso, setReceiveModalTraspaso] = useState<Traspaso | null>(null);
  const [printModalTraspaso, setPrintModalTraspaso] = useState<Traspaso | null>(null);

  // Acciones en curso
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listTraspasos, listSucursales, resProds] = await Promise.all([
        getTraspasos(),
        getSucursales(),
        fetch("/api/productos?withStock=true").then((r) => (r.ok ? r.json() : [])),
      ]);
      setTraspasos(listTraspasos);
      setSucursales(listSucursales);
      setProductos(resProds);
    } catch (err) {
      console.error("Error al cargar datos de traspasos:", err);
      toast.error("Error al cargar los datos de traspasos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mapa de productos indexado por ID para lookup ultrarrápido de imágenes y modelos
  const productosMap = useMemo(() => {
    const map: Record<string, Producto> = {};
    for (const p of productos) {
      map[p._id] = p;
    }
    return map;
  }, [productos]);

  // Acciones
  const handleDespachar = async (id: string) => {
    if (
      !confirm(
        "¿Confirmas el despacho de esta mercadería?\n\nEl stock saldrá físicamente del almacén de origen y pasará al estado EN TRÁNSITO."
      )
    ) {
      return;
    }
    try {
      setActionLoading(true);
      await despacharTraspaso(id);
      toast.success("Mercadería despachada. Ahora se encuentra EN TRÁNSITO.");
      await loadData();
      if (selectedTraspaso?._id === id) setSelectedTraspaso(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al despachar");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRecibir = async (
    traspasoId: string,
    data?: {
      itemsRecibidos?: Array<{
        varianteId: string;
        cantidadRecibida: number;
      }>;
      notasRecepcion?: string;
    }
  ) => {
    try {
      setActionLoading(true);
      await recibirTraspaso(traspasoId, data);
      setReceiveModalTraspaso(null);
      if (selectedTraspaso?._id === traspasoId) setSelectedTraspaso(null);
      await loadData();
    } catch (err: unknown) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (
      !confirm(
        "¿Seguro que deseas cancelar este traspaso?\n\nSi estaba en tránsito, el stock será restituido automáticamente a la sucursal de origen."
      )
    ) {
      return;
    }
    try {
      setActionLoading(true);
      await cancelarTraspaso(id);
      toast.success("Traspaso cancelado correctamente");
      await loadData();
      if (selectedTraspaso?._id === id) setSelectedTraspaso(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cancelar");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrado reactivo con búsqueda inteligente
  const traspasosFiltrados = useMemo(() => {
    return traspasos.filter((t) => {
      // Filtro por Estado
      if (filtroEstado !== "TODOS" && t.estado !== filtroEstado) {
        return false;
      }

      // Filtro por Sucursal
      if (filtroSucursal !== "TODAS") {
        const origId = typeof t.sucursalOrigenId === "object" ? t.sucursalOrigenId._id : t.sucursalOrigenId;
        const destId = typeof t.sucursalDestinoId === "object" ? t.sucursalDestinoId._id : t.sucursalDestinoId;
        if (origId !== filtroSucursal && destId !== filtroSucursal) {
          return false;
        }
      }

      // Filtro por Query (Texto)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (t.numeroTraspaso || "").toLowerCase();
        const mot = (t.motivo || "").toLowerCase();
        const origNom =
          typeof t.sucursalOrigenId === "object"
            ? (t.sucursalOrigenId.nombre || "").toLowerCase()
            : "";
        const destNom =
          typeof t.sucursalDestinoId === "object"
            ? (t.sucursalDestinoId.nombre || "").toLowerCase()
            : "";

        const matchesProduct = (t.items || []).some((it) => {
          const prodNom = (it.productoSnapshot?.nombre || "").toLowerCase();
          const prodMod = (it.productoSnapshot?.modelo || "").toLowerCase();
          const prodSku = (it.productoSnapshot?.sku || "").toLowerCase();
          const varCol = (it.varianteSnapshot?.color || "").toLowerCase();
          return prodNom.includes(q) || prodMod.includes(q) || prodSku.includes(q) || varCol.includes(q);
        });

        if (
          !num.includes(q) &&
          !mot.includes(q) &&
          !origNom.includes(q) &&
          !destNom.includes(q) &&
          !matchesProduct
        ) {
          return false;
        }
      }

      return true;
    });
  }, [traspasos, filtroEstado, filtroSucursal, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Transferencias entre Sucursales
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Kárdex & Tránsito
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Gestión logística integral: mueve stock entre tiendas y almacenes con control en tránsito,
            fotografías de prendas, modelos y conservación del costo valorado (CPP).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            title="Recargar datos"
            disabled={loading}
            className="p-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-cyan-950/50 hover:shadow-cyan-900/60 transition active:scale-98 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nuevo Traspaso</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Interactivas */}
      <TraspasoKPIs
        traspasos={traspasos}
        filtroEstado={filtroEstado}
        onSelectFiltro={(est) => setFiltroEstado(est)}
      />

      {/* Barra de Filtros, Búsqueda y Modos de Vista */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4 space-y-3 shadow-lg">
        {/* Pills de Estado */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className="flex gap-1.5 shrink-0">
            {(
              [
                { id: "TODOS", label: "Todos" },
                { id: "SOLICITADA", label: "Solicitadas" },
                { id: "EN_TRANSITO", label: "En Tránsito" },
                { id: "RECIBIDA", label: "Recibidas" },
                { id: "CANCELADA", label: "Canceladas" },
              ] as const
            ).map((item) => {
              const active = filtroEstado === item.id;
              const count =
                item.id === "TODOS"
                  ? traspasos.length
                  : traspasos.filter((t) => t.estado === item.id).length;

              return (
                <button
                  key={item.id}
                  onClick={() => setFiltroEstado(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer select-none whitespace-nowrap ${
                    active
                      ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      active ? "bg-cyan-500/30 text-cyan-200" : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Toggle de Modo de Vista (Desktop) */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10 shrink-0">
            <button
              onClick={() => setViewMode("table")}
              title="Vista de Tabla"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === "table" || viewMode === "auto"
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="Vista de Tarjetas"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Buscador & Selector de Sucursal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="relative sm:col-span-2">
            <input
              type="text"
              placeholder="Buscar por código (TRF-...), prenda, modelo, SKU o sucursal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-slate-950/80 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div>
            <select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-slate-950/80 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="TODAS">Todas las Sucursales</option>
              {sucursales.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.nombre} ({s.codigo})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contenedor Principal de Lista / Tabla */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : traspasosFiltrados.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-12 text-center text-slate-400 space-y-3 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl mx-auto text-slate-300">
            🔄
          </div>
          <h3 className="text-lg font-bold text-white">No hay transferencias encontradas</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {searchQuery || filtroEstado !== "TODOS" || filtroSucursal !== "TODAS"
              ? "Prueba cambiando los filtros o el término de búsqueda."
              : "Comienza registrando tu primera transferencia entre sucursales para abastecer tus tiendas."}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition cursor-pointer mt-2"
          >
            + Crear Primer Traspaso
          </button>
        </div>
      ) : (
        <>
          {/* Vista Móvil: Tarjetas táctiles siempre activas en pantallas pequeñas */}
          <div className="block md:hidden space-y-3">
            {traspasosFiltrados.map((t) => (
              <TraspasoCard
                key={t._id}
                traspaso={t}
                productosMap={productosMap}
                actionLoading={actionLoading}
                onView={(item) => setSelectedTraspaso(item)}
                onDespachar={handleDespachar}
                onRecibir={(item) => setReceiveModalTraspaso(item)}
                onCancelar={handleCancelar}
                onPrint={(item) => setPrintModalTraspaso(item)}
              />
            ))}
          </div>

          {/* Vista Desktop: Tabla o Grid según selección */}
          <div className="hidden md:block">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {traspasosFiltrados.map((t) => (
                  <TraspasoCard
                    key={t._id}
                    traspaso={t}
                    productosMap={productosMap}
                    actionLoading={actionLoading}
                    onView={(item) => setSelectedTraspaso(item)}
                    onDespachar={handleDespachar}
                    onRecibir={(item) => setReceiveModalTraspaso(item)}
                    onCancelar={handleCancelar}
                    onPrint={(item) => setPrintModalTraspaso(item)}
                  />
                ))}
              </div>
            ) : (
              <TraspasoTable
                traspasos={traspasosFiltrados}
                productosMap={productosMap}
                actionLoading={actionLoading}
                onView={(item) => setSelectedTraspaso(item)}
                onDespachar={handleDespachar}
                onRecibir={(item) => setReceiveModalTraspaso(item)}
                onCancelar={handleCancelar}
                onPrint={(item) => setPrintModalTraspaso(item)}
              />
            )}
          </div>
        </>
      )}

      {/* Modales */}
      {showCreateModal && (
        <NuevoTraspasoModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          sucursales={sucursales}
          productos={productos}
          onCreated={loadData}
          onSubmit={async (data) => {
            await crearTraspaso(data);
          }}
        />
      )}

      {selectedTraspaso && (
        <DetalleTraspasoModal
          traspaso={selectedTraspaso}
          productosMap={productosMap}
          actionLoading={actionLoading}
          onClose={() => setSelectedTraspaso(null)}
          onDespachar={handleDespachar}
          onRecibir={(item) => {
            setSelectedTraspaso(null);
            setReceiveModalTraspaso(item);
          }}
          onCancelar={handleCancelar}
          onPrint={(item) => setPrintModalTraspaso(item)}
        />
      )}

      {receiveModalTraspaso && (
        <RecibirTraspasoModal
          traspaso={receiveModalTraspaso}
          productosMap={productosMap}
          actionLoading={actionLoading}
          onClose={() => setReceiveModalTraspaso(null)}
          onConfirm={handleConfirmRecibir}
        />
      )}

      {printModalTraspaso && (
        <GuiaTraspasoPrintModal
          traspaso={printModalTraspaso}
          productosMap={productosMap}
          onClose={() => setPrintModalTraspaso(null)}
        />
      )}
    </div>
  );
}
