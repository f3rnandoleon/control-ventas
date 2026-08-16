"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createProducto, deleteProducto, getProductos, updateProducto } from "@/services/producto.service";
import type { Producto } from "@/types/producto";
import ProductoForm from "@/components/productos/ProductoForm";
import ProductoModal from "@/components/productos/ProductoModal";
import VariantesManager from "@/components/productos/VariantesManager";
import ProductoFilters, { EMPTY_PRODUCT_FILTERS, type ProductoFilterValues } from "@/components/productos/ProductoFilters";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import { getEstadoStock, getStockProducto } from "@/utils/stock";
import { generarReporteStockPDF } from "@/utils/reportes/generarReporteStock";
import { generarReporteProductoPDF } from "@/utils/reportes/generarReporteProducto";
import { generarImagenVariantesDisponibles } from "@/utils/reportes/generarImagenVariantes";

export default function AdminProductosPage() {
  type ModalView = "PRODUCTO" | "VARIANTES";
  const [view, setView] = useState<ModalView>("PRODUCTO");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ProductoFilterValues>(EMPTY_PRODUCT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(null);

  const loadProductos = async () => {
    setLoading(true);
    try {
      const fetched = await getProductos({ withStock: true });
      setProductos(fetched);
      setEditing((current) => current ? fetched.find((p) => p._id === current._id) || current : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los productos");
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadProductos(); }, []);

  const categorias = useMemo(() => {
    const normalized = new Map<string, string>();
    productos.forEach((producto) => {
      const value = producto.categoria?.trim();
      if (value && !normalized.has(value.toLocaleLowerCase("es"))) normalized.set(value.toLocaleLowerCase("es"), value);
    });
    return [...normalized.values()].sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);

  const filteredProductos = useMemo(() => productos.filter((producto) => {
    const query = search.trim().toLocaleLowerCase("es");
    const searchable = [producto.nombre, producto.modelo, producto.sku, ...producto.variantes.flatMap((v) => [v.color, v.colorSecundario, v.talla])]
      .filter(Boolean).join(" ").toLocaleLowerCase("es");
    if (query && !searchable.includes(query)) return false;
    if (filters.categoria && producto.categoria?.trim().toLocaleLowerCase("es") !== filters.categoria.toLocaleLowerCase("es")) return false;
    const min = filters.precioMin === "" ? null : Number(filters.precioMin);
    const max = filters.precioMax === "" ? null : Number(filters.precioMax);
    if (min !== null && producto.precioVenta < min) return false;
    if (max !== null && producto.precioVenta > max) return false;
    if (filters.estadoStock) {
      const { disponible } = getStockProducto(producto);
      if (getEstadoStock(disponible, producto.stockMinimo) !== filters.estadoStock) return false;
    }
    return true;
  }), [productos, search, filters]);

  const handleSave = async (data: Partial<Producto>) => {
    try {
      if (editing) await updateProducto(editing._id, data); else await createProducto(data);
      setModalOpen(false); setEditing(null); await loadProductos();
      toast.success(editing ? "Producto actualizado" : "Producto creado");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar el producto"); }
  };

  const handleDelete = async (producto: Producto) => {
    if (!window.confirm(`¿Eliminar ${producto.nombre}?`)) return;
    try { await deleteProducto(producto._id); await loadProductos(); toast.success("Producto eliminado"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo eliminar el producto"); }
  };

  const handleDownloadVariantsImage = async (producto: Producto) => {
    setDownloadingImageId(producto._id);
    try {
      await generarImagenVariantesDisponibles(producto);
      toast.success("Imagen de variantes descargada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar la imagen");
    } finally {
      setDownloadingImageId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-bold">Productos</h1><p className="mt-1 text-sm text-gray-400">{filteredProductos.length} de {productos.length} productos visibles</p></div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary" disabled={!filteredProductos.length} onClick={() => generarReporteStockPDF(filteredProductos)}>Generar reporte</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setView("PRODUCTO"); setModalOpen(true); }}>+ Nuevo producto</button>
        </div>
      </div>
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, modelo, SKU o variante..." className="input" />
      <ProductoFilters value={filters} categorias={categorias} onChange={setFilters} />

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_20px_rgba(0,180,255,0.15)]">
        <table className="w-full text-sm text-gray-300">
          <thead className="border-b border-white/10 text-gray-400"><tr>
            <th className="px-4 py-4">Imagen</th><th className="px-4">Nombre</th><th>Modelo</th><th>Precio Venta</th><th>Precio Costo</th><th className="px-6 text-right">Acciones</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="py-8 text-center">Cargando productos...</td></tr>}
            {!loading && filteredProductos.map((producto) => {
              const imagen = producto.variantes.map(getVarianteImagenPrincipal).find(Boolean);
              return <tr key={producto._id} className="border-b border-white/5 transition hover:bg-white/5">
                <td className="px-4 py-3">{imagen ? <CloudinaryImage src={imagen} alt={producto.nombre} width={40} height={40} className="h-10 w-10 rounded-lg object-cover" /> : <div className="surface-placeholder flex h-10 w-10 items-center justify-center rounded-lg" aria-label="Sin imagen">▧</div>}</td>
                <td className="px-4 py-4 font-medium text-white">{producto.nombre}</td><td>{producto.modelo}</td>
                <td>Bs {producto.precioVenta}</td><td>Bs {producto.precioCosto}</td>
                <td className="whitespace-nowrap px-6 text-right">
                  <button className="btn-link mr-3" onClick={() => { setEditing(producto); setView("PRODUCTO"); setModalOpen(true); }}>Editar</button>
                  <button className="btn-link mr-3" onClick={() => { setEditing(producto); setView("VARIANTES"); setModalOpen(true); }}>Variantes</button>
                  <button className="btn-link mr-3" onClick={() => generarReporteProductoPDF(producto)}>Reporte</button>
                  <button className="btn-link mr-3" disabled={downloadingImageId === producto._id} onClick={() => void handleDownloadVariantsImage(producto)}>{downloadingImageId === producto._id ? "Generando..." : "Imagen variantes"}</button>
                  <button className="btn-danger" onClick={() => void handleDelete(producto)}>Eliminar</button>
                </td>
              </tr>;
            })}
            {!loading && productos.length === 0 && <tr><td colSpan={6} className="py-8 text-center">No hay productos registrados</td></tr>}
            {!loading && productos.length > 0 && filteredProductos.length === 0 && <tr><td colSpan={6} className="py-8 text-center">No hay productos que coincidan con los filtros</td></tr>}
          </tbody>
        </table>
      </div>
      <ProductoModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={view === "PRODUCTO" ? (editing ? "Editar producto" : "Nuevo producto") : "Gestionar variantes"}>
        {view === "PRODUCTO" && <ProductoForm initialData={editing || undefined} onSubmit={handleSave} />}
        {view === "VARIANTES" && editing && <VariantesManager producto={editing} onUpdated={loadProductos} />}
      </ProductoModal>
    </div>
  );
}
