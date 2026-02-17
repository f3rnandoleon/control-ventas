"use client";

import { InventarioItem } from "@/types/inventario";
import { useState, useMemo } from "react";

export default function InventarioTable({
  items,
  loading,
}: {
  items: InventarioItem[];
  loading: boolean;
}) {
  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("TODOS");
  const [productoFiltro, setProductoFiltro] = useState<string>("TODOS");

  // Obtener lista única de productos
  const productosUnicos = useMemo(() => {
    const productos = items.map((i) => ({
      id: i.productoId._id,
      nombre: i.productoId.nombre,
    }));
    const uniqueMap = new Map(productos.map((p) => [p.id, p]));
    return Array.from(uniqueMap.values());
  }, [items]);

  // Aplicar filtros
  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      // Filtro por fecha desde
      if (fechaDesde) {
        const fechaItem = new Date(item.createdAt);
        const fechaDesdeDate = new Date(fechaDesde);
        if (fechaItem < fechaDesdeDate) return false;
      }

      // Filtro por fecha hasta
      if (fechaHasta) {
        const fechaItem = new Date(item.createdAt);
        const fechaHastaDate = new Date(fechaHasta + "T23:59:59");
        if (fechaItem > fechaHastaDate) return false;
      }

      // Filtro por tipo
      if (tipoFiltro !== "TODOS" && item.tipo !== tipoFiltro) {
        return false;
      }

      // Filtro por producto
      if (productoFiltro !== "TODOS" && item.productoId._id !== productoFiltro) {
        return false;
      }

      return true;
    });
  }, [items, fechaDesde, fechaHasta, tipoFiltro, productoFiltro]);

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setTipoFiltro("TODOS");
    setProductoFiltro("TODOS");
  };

  const hayFiltrosActivos =
    fechaDesde || fechaHasta || tipoFiltro !== "TODOS" || productoFiltro !== "TODOS";

  if (loading) {
    return <p className="text-gray-400">Cargando inventario...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Panel de Filtros */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
            🔍 Filtros
          </h3>
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Fecha Desde */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Tipo de Movimiento */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo</label>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="TODOS">Todos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="DEVOLUCION">Devolución</option>
            </select>
          </div>

          {/* Producto */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Producto</label>
            <select
              value={productoFiltro}
              onChange={(e) => setProductoFiltro(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="TODOS">Todos</option>
              {productosUnicos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="text-xs text-gray-400">
          Mostrando <span className="text-cyan-400 font-semibold">{itemsFiltrados.length}</span> de{" "}
          <span className="text-gray-300">{items.length}</span> movimientos
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,180,255,0.15)] overflow-x-auto">
        <table className="w-full text-sm text-gray-300">
          <thead className="text-gray-400 border-b border-white/10">
            <tr>
              <th className="px-6 py-4">Fecha</th>
              <th>Producto</th>
              <th>Variante</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Stock</th>
              <th>Usuario</th>
            </tr>
          </thead>

          <tbody>
            {itemsFiltrados.map((i) => (
              <tr
                key={i._id}
                className="border-b border-white/5 hover:bg-white/5"
              >
                <td className="px-6 py-3">
                  {new Date(i.createdAt).toLocaleString()}
                </td>
                <td>{i.productoId.nombre}</td>
                <td>
                  {i.variante.color} / {i.variante.talla}
                </td>
                <td>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold
                    ${i.tipo === "ENTRADA"
                        ? "bg-green-500/20 text-green-400"
                        : i.tipo === "SALIDA"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                  >
                    {i.tipo}
                  </span>
                </td>
                <td>{i.cantidad}</td>
                <td>
                  {i.stockAnterior} →{" "}
                  <span className="text-cyan-400">
                    {i.stockActual}
                  </span>
                </td>
                <td>{i.usuario?.fullname || "-"}</td>
              </tr>
            ))}

            {itemsFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  {hayFiltrosActivos
                    ? "No hay movimientos que coincidan con los filtros"
                    : "No hay movimientos de inventario"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
