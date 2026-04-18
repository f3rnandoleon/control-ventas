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
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProductos = async () => {
    setLoading(true);

    try {
      const fetchedProductos = await getProductos();
      setProductos(fetchedProductos);
      setEditing((currentEditing) => {
        if (!currentEditing) {
          return currentEditing;
        }

        return (
          fetchedProductos.find((producto) => producto._id === currentEditing._id) ||
          currentEditing
        );
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductos();
  }, []);

  const filteredProductos = productos.filter((producto) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const variantValues = producto.variantes.flatMap((variante) => [
      variante.color,
      variante.talla,
    ]);

    return [producto.nombre, producto.modelo, producto.sku, ...variantValues]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const handleSave = async (data: Partial<Producto>) => {
    if (editing) {
      await updateProducto(editing._id, data);
    } else {
      await createProducto(data);
    }

    setModalOpen(false);
    setEditing(null);
    await loadProductos();
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="mt-1 text-sm text-gray-400">
            {filteredProductos.length} de {productos.length} productos visibles
          </p>
        </div>
        
      </div>
      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, modelo, SKU o variante..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40 lg:w-full"
          />
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
              setView("PRODUCTO");
            }}
            className="btn-primary max-w-60 min-w-60 px-6"
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
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Cargando productos...
                </td>
              </tr>
            )}

            {!loading &&
              filteredProductos.map((p) => (
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
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No hay productos registrados
                </td>
              </tr>
            )}

            {!loading && productos.length > 0 && filteredProductos.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No hay productos que coincidan con la busqueda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <ProductoModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
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
