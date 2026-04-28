"use client";

import { useMemo, useState } from "react";
import { InventarioItem } from "@/types/inventario";

const getProductoNombre = (item: InventarioItem) =>
  item.productoId?.nombre || "Producto eliminado";

export default function InventarioTable({
  items,
  loading,
}: {
  items: InventarioItem[];
  loading: boolean;
}) {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("TODOS");
  const [productoFiltro, setProductoFiltro] = useState<string>("TODOS");

  const productosUnicos = useMemo(() => {
    const productos = items
      .filter(
        (
          item
        ): item is InventarioItem & {
          productoId: NonNullable<InventarioItem["productoId"]>;
        } => Boolean(item.productoId)
      )
      .map((item) => ({
        id: item.productoId._id,
        nombre: item.productoId.nombre,
      }));

    const uniqueMap = new Map(productos.map((producto) => [producto.id, producto]));
    return Array.from(uniqueMap.values());
  }, [items]);

  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      if (fechaDesde) {
        const fechaItem = new Date(item.createdAt);
        const fechaDesdeDate = new Date(fechaDesde);
        if (fechaItem < fechaDesdeDate) return false;
      }

      if (fechaHasta) {
        const fechaItem = new Date(item.createdAt);
        const fechaHastaDate = new Date(`${fechaHasta}T23:59:59`);
        if (fechaItem > fechaHastaDate) return false;
      }

      if (tipoFiltro !== "TODOS" && item.tipo !== tipoFiltro) {
        return false;
      }

      if (
        productoFiltro !== "TODOS" &&
        item.productoId?._id !== productoFiltro
      ) {
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
    Boolean(fechaDesde) ||
    Boolean(fechaHasta) ||
    tipoFiltro !== "TODOS" ||
    productoFiltro !== "TODOS";

  if (loading) {
    return <p className="text-gray-400">Cargando inventario...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
            Filtros
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
          <div>
            <label className="block text-xs text-gray-400 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

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
              <option value="DEVOLUCION">Devolucion</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Producto</label>
            <select
              value={productoFiltro}
              onChange={(e) => setProductoFiltro(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="TODOS">Todos</option>
              {productosUnicos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Mostrando{" "}
          <span className="text-cyan-400 font-semibold">
            {itemsFiltrados.length}
          </span>{" "}
          de <span className="text-gray-300">{items.length}</span> movimientos
        </div>
      </div>

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
            {itemsFiltrados.map((item) => (
              <tr
                key={item._id}
                className="border-b border-white/5 hover:bg-white/5"
              >
                <td className="px-6 py-3">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td>{getProductoNombre(item)}</td>
                <td>
                  {item.variante.color} / {item.variante.talla}
                </td>
                <td>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.tipo === "ENTRADA"
                        ? "bg-green-500/20 text-green-400"
                        : item.tipo === "SALIDA"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {item.tipo}
                  </span>
                </td>
                <td>{item.cantidad}</td>
                <td>
                  {item.stockAnterior} -&gt;{" "}
                  <span className="text-cyan-400">{item.stockActual}</span>
                </td>
                <td>{item.usuario?.nombreCompleto || "-"}</td>
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
