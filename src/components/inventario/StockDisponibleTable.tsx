"use client";

import { ProductoInventario } from "@/types/inventario";
import { useState } from "react";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";

export default function StockDisponibleTable({
    productos,
    searchTerm = "",
}: {
    productos: ProductoInventario[];
    searchTerm?: string;
}) {
    const [ordenarPor, setOrdenarPor] = useState<"nombre" | "stock">("nombre");

    // Expandir productos en variantes individuales
    const variantes = productos.flatMap((producto) =>
        producto.variantes.map((variante) => ({
            productoId: producto._id,
            productoNombre: producto.nombre,
            color: variante.color,
            talla: variante.talla,
            stock: variante.stock,
            imagen: getVarianteImagenPrincipal(variante),
            stockMinimo: producto.stockMinimo || 5,
        }))
    );

    const query = searchTerm.trim().toLowerCase();

    const variantesFiltradas = variantes.filter((variante) => {
        if (!query) {
            return true;
        }

        return [variante.productoNombre, variante.color, variante.talla]
            .join(" ")
            .toLowerCase()
            .includes(query);
    });

    // Ordenar
    const variantesOrdenadas = [...variantesFiltradas].sort((a, b) => {
        if (ordenarPor === "stock") {
            return a.stock - b.stock;
        }
        return a.productoNombre.localeCompare(b.productoNombre);
    });

    // Función para determinar el estado del stock
    const getEstadoStock = (stock: number, stockMinimo: number) => {
        if (stock === 0) {
            return {
                label: "Sin stock",
                color: "bg-red-500/20 text-red-400 border-red-500/50",
                icon: "🔴",
            };
        } else if (stock <= stockMinimo) {
            return {
                label: "Stock bajo",
                color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
                icon: "🟡",
            };
        } else {
            return {
                label: "Stock normal",
                color: "bg-green-500/20 text-green-400 border-green-500/50",
                icon: "🟢",
            };
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,180,255,0.15)] overflow-hidden">
            {/* Header con controles */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-cyan-400">
                    Stock Disponible por Variante
                </h3>
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400">Ordenar por:</span>
                    <select
                        value={ordenarPor}
                        onChange={(e) => setOrdenarPor(e.target.value as "nombre" | "stock")}
                        className="bg-gray-800/50 border border-white/10 rounded-md px-3 py-1 text-sm text-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    >
                        <option value="nombre">Nombre</option>
                        <option value="stock">Stock (menor a mayor)</option>
                    </select>
                </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-300">
                    <thead className="text-gray-400 border-b border-white/10 bg-white/5">
                        <tr>
                            <th className="px-4 py-3 text-left">Imagen</th>
                            <th className="px-4 py-3 text-left">Producto</th>
                            <th className="px-4 py-3 text-left">Color</th>
                            <th className="px-4 py-3 text-left">Talla</th>
                            <th className="px-4 py-3 text-center">Stock Actual</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                    </thead>

                    <tbody>
                        {variantesOrdenadas.map((v, idx) => {
                            const estado = getEstadoStock(v.stock, v.stockMinimo);
                            return (
                                <tr
                                    key={`${v.productoId}-${v.color}-${v.talla}-${idx}`}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    {/* Imagen */}
                                    <td className="px-4 py-3">
                                        {v.imagen ? (
                                            <CloudinaryImage
                                                src={v.imagen}
                                                alt={`${v.color} - ${v.talla}`}
                                                width={48}
                                                height={48}
                                                className="w-12 h-12 object-cover rounded-lg border border-white/20"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-800/50 border border-white/10 rounded-lg flex items-center justify-center text-gray-600">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-6 w-6"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                    </td>

                                    {/* Producto */}
                                    <td className="px-4 py-3 font-medium">{v.productoNombre}</td>

                                    {/* Color */}
                                    <td className="px-4 py-3">{v.color}</td>

                                    {/* Talla */}
                                    <td className="px-4 py-3">{v.talla}</td>

                                    {/* Stock */}
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-mono font-bold text-cyan-400 text-base">
                                            {v.stock}
                                        </span>
                                    </td>

                                    {/* Estado */}
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${estado.color}`}
                                        >
                                            <span>{estado.icon}</span>
                                            {estado.label}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}

                        {variantesOrdenadas.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-400">
                                    {query
                                        ? "No hay variantes que coincidan con la busqueda"
                                        : "No hay productos en el inventario"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer con resumen */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex gap-6 text-xs text-gray-400">
                <div>
                    Total variantes: <span className="text-cyan-400 font-semibold">{variantesOrdenadas.length}</span>
                </div>
                <div>
                    Sin stock: <span className="text-red-400 font-semibold">{variantesOrdenadas.filter(v => v.stock === 0).length}</span>
                </div>
                <div>
                    Stock bajo: <span className="text-yellow-400 font-semibold">{variantesOrdenadas.filter(v => v.stock > 0 && v.stock <= v.stockMinimo).length}</span>
                </div>
            </div>
        </div>
    );
}
