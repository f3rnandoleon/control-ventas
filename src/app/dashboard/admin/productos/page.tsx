"use client";

import { useEffect, useState } from "react";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "@/services/producto.service";
import { Producto } from "@/types/producto";
import ProductoForm from "@/components/productos/ProductoForm";
import ProductoModal from "@/components/productos/ProductoModal";
import VariantesManager from "@/components/productos/VariantesManager";

export default function AdminProductosPage() {
  type ModalView = "PRODUCTO" | "VARIANTES";

  const [view, setView] = useState<ModalView>("PRODUCTO");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProductos = async () => {
    setLoading(true);
    setProductos(await getProductos());
    setLoading(false);
  };

  useEffect(() => {
    loadProductos();
  }, []);

  const handleSave = async (data: Partial<Producto>) => {
    editing
      ? await updateProducto(editing._id, data)
      : await createProducto(data);

    setModalOpen(false);
    setEditing(null);
    loadProductos();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
            setView("PRODUCTO");
          }}
          className="btn-primary max-w-60 px-6"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Table */}
      <div
        className="bg-white/5 border border-white/10 rounded-2xl
        shadow-[0_0_20px_rgba(0,180,255,0.15)]
        overflow-x-auto"
      >
        <table className="w-full text-sm text-gray-300">
          <thead className="text-gray-400 border-b border-white/10">
            <tr>
              <th className="px-6 py-4">Nombre</th>
              <th>Modelo</th>
              <th>Precio Venta</th>
              <th>Precio Costo</th>
              <th className="text-center px-6">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Cargando productos...
                </td>
              </tr>
            )}

            {!loading &&
              productos.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-white/5 hover:bg-white/5 transition"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {p.nombre}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{p.modelo}</td>
                  <td className="px-6 py-4 font-medium text-white">Bs {p.precioVenta}</td>
                  <td className="px-6 py-4 font-medium text-white">Bs {p.precioCosto}</td>

                  <td className="px-6 text-right space-x-4">
                    <button
                        className="btn-link"
                        onClick={() => {
                        setEditing(p);
                        setView("PRODUCTO");
                        setModalOpen(true);
                        }}
                    >
                        Editar
                    </button>

                    <button
                        className="btn-link"
                        onClick={() => {
                        setEditing(p);
                        setView("VARIANTES");
                        setModalOpen(true);
                        }}
                    >
                        Variantes
                    </button>

                    <button
                        className="btn-danger"
                        onClick={() => deleteProducto(p._id).then(loadProductos)}
                    >
                        Eliminar
                    </button>
                    </td>

                </tr>
              ))}

            {!loading && productos.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  No hay productos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <ProductoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
            view === "PRODUCTO"
            ? "Editar producto"
            : "Gestionar variantes"
        }
        >
        {view === "PRODUCTO" && (
            <ProductoForm
            initialData={editing || undefined}
            onSubmit={handleSave}
            />
        )}

        {view === "VARIANTES" && editing && (
            <VariantesManager
            producto={editing}
            onUpdated={loadProductos}
            />
        )}
        </ProductoModal>


    </div>
  );
}
