"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  getSucursales,
  crearSucursal,
  actualizarSucursal,
  toggleActivarSucursal,
} from "@/services/sucursales.service";
import type { Sucursal, TipoSucursal } from "@/types/sucursal";

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    tipo: "TIENDA_FISICA" as TipoSucursal,
    direccion: "",
    ciudad: "La Paz",
    telefono: "",
    permiteVentaPOS: true,
    permiteDespachoWeb: false,
    permiteRetiroCliente: true,
    requiereAperturaCaja: true,
    esAlmacenPrincipal: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getSucursales();
      setSucursales(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingSucursal(null);
    setFormData({
      nombre: "",
      codigo: "",
      tipo: "TIENDA_FISICA",
      direccion: "",
      ciudad: "La Paz",
      telefono: "",
      permiteVentaPOS: true,
      permiteDespachoWeb: false,
      permiteRetiroCliente: true,
      requiereAperturaCaja: true,
      esAlmacenPrincipal: false,
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEdit = (s: Sucursal) => {
    setEditingSucursal(s);
    setFormData({
      nombre: s.nombre,
      codigo: s.codigo,
      tipo: s.tipo,
      direccion: s.direccion || "",
      ciudad: s.ciudad || "La Paz",
      telefono: s.telefono || "",
      permiteVentaPOS: s.permiteVentaPOS,
      permiteDespachoWeb: s.permiteDespachoWeb,
      permiteRetiroCliente: s.permiteRetiroCliente,
      requiereAperturaCaja: s.requiereAperturaCaja ?? true,
      esAlmacenPrincipal: s.esAlmacenPrincipal || false,
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const handleToggleActiva = async (s: Sucursal) => {
    try {
      await toggleActivarSucursal(s._id, !s.activa);
      toast.success(`Sucursal ${!s.activa ? "activada" : "desactivada"} exitosamente`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      if (editingSucursal) {
        await actualizarSucursal(editingSucursal._id, formData);
        toast.success("Sucursal actualizada correctamente");
      } else {
        await crearSucursal(formData);
        toast.success("Sucursal creada correctamente");
      }
      setShowModal(false);
      setEditingSucursal(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar sucursal");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAlmacenes = sucursales.filter((s) => s.tipo === "ALMACEN_CENTRAL").length;
  const totalTiendas = sucursales.filter((s) => s.tipo === "TIENDA_FISICA").length;
  const totalPuntosRetiro = sucursales.filter((s) => s.tipo === "PUNTO_RETIRO").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Red de Sucursales y Almacenes
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestión de ubicaciones físicas, centros de distribución y canales de despacho.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-900/30 transition cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>Nueva Sucursal</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Total Ubicaciones
          </p>
          <p className="text-3xl font-extrabold text-white mt-2">{sucursales.length}</p>
          <p className="text-xs text-blue-400 mt-1">Infraestructura multi-sucursal activa</p>
        </div>
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Almacenes Centrales
          </p>
          <p className="text-3xl font-extrabold text-white mt-2">{totalAlmacenes}</p>
          <p className="text-xs text-gray-400 mt-1">Hub de compras y despacho e-commerce</p>
        </div>
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Tiendas Físicas
          </p>
          <p className="text-3xl font-extrabold text-white mt-2">{totalTiendas}</p>
          <p className="text-xs text-gray-400 mt-1">Con mostrador de ventas POS</p>
        </div>
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Puntos de Retiro
          </p>
          <p className="text-3xl font-extrabold text-white mt-2">{totalPuntosRetiro}</p>
          <p className="text-xs text-gray-400 mt-1">Entregas pick-up autorizadas</p>
        </div>
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
      ) : sucursales.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-lg font-medium text-gray-200">No hay sucursales registradas</p>
          <p className="text-sm mt-1">
            Crea tu primera sucursal para comenzar a distribuir tu inventario.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 text-left">Sucursal / Almacén</th>
                  <th className="px-5 py-4 text-left">Tipo</th>
                  <th className="px-5 py-4 text-left">Capacidades Operativas</th>
                  <th className="px-5 py-4 text-left">Contacto & Dirección</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sucursales.map((s) => (
                  <tr key={s._id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{s.nombre}</span>
                        {s.esAlmacenPrincipal && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Principal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{s.codigo}</span>
                    </td>
                    <td className="px-5 py-4">
                      {s.tipo === "ALMACEN_CENTRAL" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          📦 Almacén Central
                        </span>
                      )}
                      {s.tipo === "TIENDA_FISICA" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          🏪 Tienda Física
                        </span>
                      )}
                      {s.tipo === "PUNTO_RETIRO" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          📍 Punto de Retiro
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {s.permiteVentaPOS && (
                          <>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              POS Mostrador
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                              (s.requiereAperturaCaja ?? true)
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                            }`}>
                              {(s.requiereAperturaCaja ?? true) ? "Caja Obligatoria" : "Caja Libre"}
                            </span>
                          </>
                        )}
                        {s.permiteDespachoWeb && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                            Despacho Web
                          </span>
                        )}
                        {s.permiteRetiroCliente && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                            Retiro Local
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      <div>{s.direccion || "Sin dirección registrada"}</div>
                      {s.telefono && <div className="text-gray-500 mt-0.5">📞 {s.telefono}</div>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          s.activa
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {s.activa ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActiva(s)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                            s.activa
                              ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                          }`}
                        >
                          {s.activa ? "Desactivar" : "Activar"}
                        </button>
                        <Link
                          href={`/dashboard/admin/inventario?sucursalId=${s._id}`}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-white/10 transition"
                        >
                          Stock
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nueva / Editar Sucursal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white">
                {editingSucursal ? "Editar Sucursal" : "Nueva Sucursal / Ubicación"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Tienda 2 - Los Pozos"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Código Único *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingSucursal}
                    placeholder="Ej. TDA-02"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm uppercase font-mono ${
                      editingSucursal ? "bg-white/5 opacity-60 cursor-not-allowed" : "bg-white/5"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Tipo de Ubicación *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => {
                    const tipo = e.target.value as TipoSucursal;
                    setFormData({
                      ...formData,
                      tipo,
                      permiteVentaPOS: tipo === "TIENDA_FISICA",
                      permiteDespachoWeb: tipo === "ALMACEN_CENTRAL",
                      permiteRetiroCliente: tipo !== "ALMACEN_CENTRAL",
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-gray-800 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="TIENDA_FISICA">🏪 Tienda Física (POS mostrador)</option>
                  <option value="ALMACEN_CENTRAL">📦 Almacén Central (Distribución / Web)</option>
                  <option value="PUNTO_RETIRO">📍 Punto de Retiro (Solo entregas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="Ej. Av. Cristo Redentor esq. 3er Anillo"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. +591 70000000"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. La Paz, Santa Cruz, Cochabamba"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.permiteVentaPOS}
                    onChange={(e) => setFormData({ ...formData, permiteVentaPOS: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-600"
                  />
                  <span className="text-sm text-gray-300">
                    Permite venta directa en mostrador (POS)
                  </span>
                </label>

                {formData.permiteVentaPOS && (
                  <div className="ml-7 pl-3 border-l-2 border-blue-500/30 py-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requiereAperturaCaja}
                        onChange={(e) => setFormData({ ...formData, requiereAperturaCaja: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-500 bg-gray-800 border-gray-600"
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-200">
                          Exigir apertura de caja diaria para registrar ventas
                        </span>
                        <p className="text-[11px] text-gray-400">
                          Si está marcado, no se podrá cobrar en mostrador sin abrir turno previo. Si se desmarca, se opera en modo &quot;Caja Libre&quot;.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.permiteDespachoWeb}
                    onChange={(e) => setFormData({ ...formData, permiteDespachoWeb: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-600"
                  />
                  <span className="text-sm text-gray-300">
                    Almacén para envíos y pedidos web
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.permiteRetiroCliente}
                    onChange={(e) => setFormData({ ...formData, permiteRetiroCliente: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-600"
                  />
                  <span className="text-sm text-gray-300">
                    Habilitada como punto de retiro para clientes
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-900/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Guardando..." : editingSucursal ? "Guardar Cambios" : "Crear Sucursal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
