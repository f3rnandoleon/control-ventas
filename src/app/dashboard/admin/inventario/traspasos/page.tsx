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
import { formatMoney } from "@/utils/pricing";

export default function TraspasosPage() {
  const [traspasos, setTraspasos] = useState<Traspaso[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTraspaso, setSelectedTraspaso] = useState<Traspaso | null>(null);
  const [receiveModalTraspaso, setReceiveModalTraspaso] = useState<Traspaso | null>(null);

  // Estados de formulario de nuevo traspaso
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [motivo, setMotivo] = useState("Reabastecimiento de tienda");
  const [notasEnvio, setNotasEnvio] = useState("");
  const [itemsDraft, setItemsDraft] = useState<
    Array<{
      productoId: string;
      productoNombre: string;
      varianteId: string;
      color: string;
      talla: string;
      sku: string;
      cantidadEnviada: number;
    }>
  >([]);

  // Selector de ítem en borrador
  const [selectedProdId, setSelectedProdId] = useState("");
  const [selectedVarId, setSelectedVarId] = useState("");
  const [cantidadAdd, setCantidadAdd] = useState(1);

  // Acciones en curso
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

      if (listSucursales.length >= 2) {
        const principal = listSucursales.find((s) => s.esAlmacenPrincipal) || listSucursales[0];
        const secondary = listSucursales.find((s) => s._id !== principal._id) || listSucursales[1];
        setOrigenId(principal._id);
        setDestinoId(secondary._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const productoActual = useMemo(
    () => productos.find((p) => p._id === selectedProdId),
    [productos, selectedProdId]
  );

  const varianteActual = useMemo(
    () => productoActual?.variantes?.find((v) => v.varianteId === selectedVarId),
    [productoActual, selectedVarId]
  );

  const handleAddItem = () => {
    if (!productoActual || !varianteActual || !varianteActual.varianteId || cantidadAdd <= 0) return;
    const vId = varianteActual.varianteId;
    const exists = itemsDraft.find((i) => i.varianteId === vId);
    if (exists) {
      setItemsDraft(
        itemsDraft.map((i) =>
          i.varianteId === vId
            ? { ...i, cantidadEnviada: i.cantidadEnviada + cantidadAdd }
            : i
        )
      );
    } else {
      setItemsDraft([
        ...itemsDraft,
        {
          productoId: productoActual._id,
          productoNombre: productoActual.nombre,
          varianteId: vId,
          color: varianteActual.color,
          talla: varianteActual.talla,
          sku: productoActual.sku,
          cantidadEnviada: cantidadAdd,
        },
      ]);
    }
    setCantidadAdd(1);
  };

  const handleRemoveItem = (varianteId: string) => {
    setItemsDraft(itemsDraft.filter((i) => i.varianteId !== varianteId));
  };

  const handleCreateTraspaso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (origenId === destinoId) {
      setErrorMsg("La sucursal de origen y destino deben ser diferentes");
      return;
    }
    if (itemsDraft.length === 0) {
      setErrorMsg("Debes agregar al menos un ítem al traspaso");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg("");
      await crearTraspaso({
        sucursalOrigenId: origenId,
        sucursalDestinoId: destinoId,
        motivo,
        notasEnvio,
        items: itemsDraft.map((i) => ({
          productoId: i.productoId,
          varianteId: i.varianteId,
          cantidad: i.cantidadEnviada,
          cantidadEnviada: i.cantidadEnviada,
        })),
      });

      setShowCreateModal(false);
      setItemsDraft([]);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al crear el traspaso");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDespachar = async (id: string) => {
    if (!confirm("¿Confirmas el despacho de esta mercadería? Saldrá del stock de la sucursal origen y pasará a EN TRÁNSITO.")) {
      return;
    }
    try {
      setActionLoading(true);
      await despacharTraspaso(id);
      await loadData();
      if (selectedTraspaso?._id === id) setSelectedTraspaso(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al despachar");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecibir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalTraspaso) return;
    try {
      setActionLoading(true);
      await recibirTraspaso(receiveModalTraspaso._id);
      setReceiveModalTraspaso(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al recibir traspaso");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm("¿Seguro que deseas cancelar esta solicitud de transferencia?")) return;
    try {
      setActionLoading(true);
      await cancelarTraspaso(id);
      await loadData();
      if (selectedTraspaso?._id === id) setSelectedTraspaso(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al cancelar");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrado
  const traspasosFiltrados = useMemo(() => {
    if (filtroEstado === "TODOS") return traspasos;
    return traspasos.filter((t) => t.estado === filtroEstado);
  }, [traspasos, filtroEstado]);

  const countSolicitadas = traspasos.filter((t) => t.estado === "SOLICITADA").length;
  const countTransito = traspasos.filter((t) => t.estado === "EN_TRANSITO").length;
  const countRecibidas = traspasos.filter((t) => t.estado === "RECIBIDA").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Transferencias entre Sucursales
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Control de movimiento y traspasos de mercadería entre tiendas y almacenes con control en tránsito.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg("");
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 transition cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>Nuevo Traspaso</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Total Transferencias
          </p>
          <p className="text-3xl font-extrabold text-white mt-2">{traspasos.length}</p>
          <p className="text-xs text-gray-400 mt-1">Histórico de movimientos</p>
        </div>
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Solicitadas (Pendientes)
          </p>
          <p className="text-3xl font-extrabold text-amber-300 mt-2">{countSolicitadas}</p>
          <p className="text-xs text-amber-500/80 mt-1">Por empaquetar y despachar</p>
        </div>
        <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-3 right-3 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </div>
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            En Tránsito (Viajando)
          </p>
          <p className="text-3xl font-extrabold text-cyan-300 mt-2">{countTransito}</p>
          <p className="text-xs text-cyan-500/80 mt-1">Stock en carretera</p>
        </div>
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Recibidas (Completadas)
          </p>
          <p className="text-3xl font-extrabold text-emerald-300 mt-2">{countRecibidas}</p>
          <p className="text-xs text-emerald-500/80 mt-1">Ingresadas a destino</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {(["TODOS", "SOLICITADA", "EN_TRANSITO", "RECIBIDA", "CANCELADA"] as const).map((est) => (
          <button
            key={est}
            onClick={() => setFiltroEstado(est)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
              filtroEstado === est
                ? "bg-white/15 text-white shadow"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {est === "TODOS"
              ? "Todos"
              : est === "SOLICITADA"
                ? "Solicitadas"
                : est === "EN_TRANSITO"
                  ? "En Tránsito"
                  : est === "RECIBIDA"
                    ? "Recibidas"
                    : "Canceladas"}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : traspasosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🔄</p>
          <p className="text-lg font-medium text-gray-200">No hay transferencias en este estado</p>
          <p className="text-sm mt-1">
            Usa el botón &quot;Nuevo Traspaso&quot; para enviar mercadería desde tu almacén central a tus tiendas.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 text-left">Código</th>
                  <th className="px-5 py-4 text-left">Ruta (Origen → Destino)</th>
                  <th className="px-5 py-4 text-center">Prendas</th>
                  <th className="px-5 py-4 text-right">Valor CPP</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {traspasosFiltrados.map((t) => {
                  const origen =
                    typeof t.sucursalOrigenId === "object"
                      ? (t.sucursalOrigenId as unknown as Sucursal).nombre
                      : "Origen";
                  const destino =
                    typeof t.sucursalDestinoId === "object"
                      ? (t.sucursalDestinoId as unknown as Sucursal).nombre
                      : "Destino";

                  return (
                    <tr key={t._id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-mono font-semibold text-white">{t.numeroTraspaso}</div>
                        <div className="text-xs text-gray-500">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-purple-300">{origen}</span>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium text-emerald-300">{destino}</span>
                        </div>
                        {t.motivo && <div className="text-xs text-gray-500 mt-0.5">{t.motivo}</div>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-white/5 font-semibold text-white text-xs">
                          {t.totalPrendasEnviadas} un.
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-cyan-300">
                        {formatMoney(t.valorTotalCostoTraspaso)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {t.estado === "SOLICITADA" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ⏳ Solicitada
                          </span>
                        )}
                        {t.estado === "EN_TRANSITO" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                            🚚 En Tránsito
                          </span>
                        )}
                        {t.estado === "RECIBIDA" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✅ Recibida
                          </span>
                        )}
                        {t.estado === "CANCELADA" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                            ✕ Cancelada
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedTraspaso(t)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white transition cursor-pointer"
                          >
                            Ver
                          </button>
                          {t.estado === "SOLICITADA" && (
                            <>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleDespachar(t._id)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow transition cursor-pointer"
                              >
                                Despachar
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleCancelar(t._id)}
                                className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-medium text-red-300 transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {t.estado === "EN_TRANSITO" && (
                            <button
                              disabled={actionLoading}
                              onClick={() => setReceiveModalTraspaso(t)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition cursor-pointer"
                            >
                              Recibir en Tienda
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Traspaso */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Nueva Solicitud de Traspaso</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Mueve stock entre sucursales conservando el costo valorado (CPP).
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTraspaso} className="space-y-4">
              {/* Rutas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Sucursal Origen (Sale stock) *
                  </label>
                  <select
                    value={origenId}
                    onChange={(e) => setOrigenId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-gray-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    {sucursales.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.nombre} ({s.codigo})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Sucursal Destino (Entra stock) *
                  </label>
                  <select
                    value={destinoId}
                    onChange={(e) => setDestinoId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-gray-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    {sucursales.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.nombre} ({s.codigo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Agregar Ítems */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  Seleccionar Variantes a Enviar
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Producto</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => {
                        setSelectedProdId(e.target.value);
                        setSelectedVarId("");
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-gray-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- Elegir producto --</option>
                      {productos.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.nombre} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Variante (Color/Talla)</label>
                    <select
                      value={selectedVarId}
                      disabled={!productoActual}
                      onChange={(e) => setSelectedVarId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-gray-800 text-white text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                    >
                      <option value="">-- Elegir variante --</option>
                      {productoActual?.variantes?.map((v) => (
                        <option key={v.varianteId} value={v.varianteId}>
                          {v.color} / {v.talla} (Disp. Global: {v.stockDisponible ?? v.stock ?? 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cantidad a Enviar</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={cantidadAdd}
                        onChange={(e) => setCantidadAdd(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-gray-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!varianteActual}
                        className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow transition disabled:opacity-50 cursor-pointer"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de ítems en borrador */}
                {itemsDraft.length > 0 && (
                  <div className="mt-3 border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-gray-300">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                        <tr>
                          <th className="px-3 py-2 text-left">Producto</th>
                          <th className="px-3 py-2 text-left">Variante</th>
                          <th className="px-3 py-2 text-center">Cantidad</th>
                          <th className="px-3 py-2 text-center">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {itemsDraft.map((item) => (
                          <tr key={item.varianteId}>
                            <td className="px-3 py-2 font-medium text-white">{item.productoNombre}</td>
                            <td className="px-3 py-2">
                              {item.color} / {item.talla}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-cyan-300">
                              {item.cantidadEnviada}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.varianteId)}
                                className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Motivo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Reabastecimiento fin de semana"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Notas de Envío
                </label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones al transportista o encargado..."
                  value={notasEnvio}
                  onChange={(e) => setNotasEnvio(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || itemsDraft.length === 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Guardando..." : "Crear Traspaso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Traspaso */}
      {selectedTraspaso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white">Detalle de Traspaso {selectedTraspaso.numeroTraspaso}</h2>
                <p className="text-xs text-gray-400">
                  Creado el {selectedTraspaso.createdAt ? new Date(selectedTraspaso.createdAt).toLocaleString() : "-"}
                </p>
              </div>
              <button
                onClick={() => setSelectedTraspaso(null)}
                className="text-gray-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-gray-400">Estado</span>
                <p className="font-bold text-white mt-1">{selectedTraspaso.estado}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-gray-400">Total Prendas</span>
                <p className="font-bold text-cyan-300 mt-1">{selectedTraspaso.totalPrendasEnviadas} un.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-gray-400">Costo Total</span>
                <p className="font-bold text-emerald-300 mt-1">{formatMoney(selectedTraspaso.valorTotalCostoTraspaso)}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-gray-400">Motivo</span>
                <p className="font-medium text-gray-200 mt-1 truncate">{selectedTraspaso.motivo || "N/A"}</p>
              </div>
            </div>

            {selectedTraspaso.notas && (
              <div className="p-3 rounded-xl bg-white/5 text-xs text-gray-300">
                <span className="font-semibold text-gray-400 block mb-0.5">Notas de Envío:</span>
                {selectedTraspaso.notas}
              </div>
            )}

            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-gray-300">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-left">Variante</th>
                    <th className="px-4 py-3 text-right">Costo Unit.</th>
                    <th className="px-4 py-3 text-center">Enviado</th>
                    <th className="px-4 py-3 text-center">Recibido</th>
                    <th className="px-4 py-3 text-right">Subtotal CPP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedTraspaso.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-semibold text-white">
                        {it.productoSnapshot?.nombre || "Producto"}
                      </td>
                      <td className="px-4 py-3">
                        {it.varianteSnapshot?.color} / {it.varianteSnapshot?.talla}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {formatMoney(it.costoUnitarioCPP)}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-white">
                        {it.cantidadEnviada}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-400">
                        {it.cantidadRecibida ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-cyan-300">
                        {formatMoney(it.cantidadEnviada * it.costoUnitarioCPP)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              {selectedTraspaso.estado === "SOLICITADA" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleDespachar(selectedTraspaso._id)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow transition cursor-pointer"
                >
                  Despachar Mercadería
                </button>
              )}
              {selectedTraspaso.estado === "EN_TRANSITO" && (
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    setReceiveModalTraspaso(selectedTraspaso);
                    setSelectedTraspaso(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition cursor-pointer"
                >
                  Recibir Mercadería
                </button>
              )}
              <button
                onClick={() => setSelectedTraspaso(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recibir Traspaso */}
      {receiveModalTraspaso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Confirmar Recepción de Mercadería
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Traspaso {receiveModalTraspaso.numeroTraspaso} • {receiveModalTraspaso.totalPrendasEnviadas} prendas
                </p>
              </div>
              <button
                onClick={() => setReceiveModalTraspaso(null)}
                className="text-gray-400 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              Al confirmar la recepción, las {receiveModalTraspaso.totalPrendasEnviadas} prendas ingresarán
              automáticamente al stock físico de la sucursal de destino y se registrará en el Kárdex.
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs text-gray-300">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-left">Variante</th>
                    <th className="px-3 py-2 text-center">Cant. Enviada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {receiveModalTraspaso.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium text-white">
                        {it.productoSnapshot?.nombre}
                      </td>
                      <td className="px-3 py-2">
                        {it.varianteSnapshot?.color} / {it.varianteSnapshot?.talla}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-emerald-400">
                        {it.cantidadEnviada}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleRecibir} className="space-y-4 pt-2">
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setReceiveModalTraspaso(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Procesando..." : "Confirmar Ingreso a Sucursal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
