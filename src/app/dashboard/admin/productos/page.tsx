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
import { getVarianteImagenPrincipal, getVarianteSegundaImagen } from "@/utils/varianteImagen";
import { getEstadoStock, getStockDisponibleVariante, getStockProducto } from "@/utils/stock";
import { generarReporteStockPDF } from "@/utils/reportes/generarReporteStock";
import { generarReporteProductoPDF } from "@/utils/reportes/generarReporteProducto";
import { generarImagenGeneralVariantesDisponibles, generarImagenVariantesDisponibles } from "@/utils/reportes/generarImagenVariantes";

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
  const [imageProduct, setImageProduct] = useState<Producto | null>(null);
  const [selectedTallas, setSelectedTallas] = useState<string[]>([]);
  const [generalImageOpen, setGeneralImageOpen] = useState(false);
  const [selectedGeneralProductNames, setSelectedGeneralProductNames] = useState<string[]>([]);
  const [selectedGeneralCategorias, setSelectedGeneralCategorias] = useState<string[]>([]);
  const [selectedGeneralTallas, setSelectedGeneralTallas] = useState<string[]>([]);

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

  const imageProductTallas = useMemo(() => {
    if (!imageProduct) return [];
    const tallas = new Set<string>();
    imageProduct.variantes.forEach((variante) => {
      if (getVarianteSegundaImagen(variante) && getStockDisponibleVariante(variante) > 0) {
        const talla = variante.talla.trim();
        if (talla) tallas.add(talla);
      }
    });
    return [...tallas].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [imageProduct]);

  const productosParaImagenGeneral = useMemo(() => productos.filter((producto) =>
    producto.variantes.some((variante) => getVarianteSegundaImagen(variante) && getStockDisponibleVariante(variante) > 0)
  ), [productos]);

  const categoriasParaImagenGeneral = useMemo(() => {
    const values = new Set<string>();
    productosParaImagenGeneral.forEach((producto) => values.add(producto.categoria?.trim() || "Sin categoria"));
    return [...values].sort((a, b) => a.localeCompare(b, "es"));
  }, [productosParaImagenGeneral]);

  const productosGeneralesFiltradosPorCategoria = useMemo(() => {
    const categoriasSeleccionadas = new Set(selectedGeneralCategorias);
    if (categoriasSeleccionadas.size === 0) return productosParaImagenGeneral;
    return productosParaImagenGeneral.filter((producto) =>
      categoriasSeleccionadas.has(producto.categoria?.trim() || "Sin categoria")
    );
  }, [productosParaImagenGeneral, selectedGeneralCategorias]);

  const gruposProductosParaImagenGeneral = useMemo(() => {
    const groups = new Map<string, { nombre: string; modelos: string[]; totalProductos: number }>();
    productosGeneralesFiltradosPorCategoria.forEach((producto) => {
      const nombre = producto.nombre.trim() || "Sin nombre";
      const key = nombre.toLocaleLowerCase("es");
      const current = groups.get(key) || { nombre, modelos: [], totalProductos: 0 };
      const modelo = producto.modelo?.trim() || "Sin modelo";
      if (!current.modelos.includes(modelo)) current.modelos.push(modelo);
      current.totalProductos += 1;
      groups.set(key, current);
    });
    return [...groups.values()]
      .map((group) => ({ ...group, modelos: group.modelos.sort((a, b) => a.localeCompare(b, "es")) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [productosGeneralesFiltradosPorCategoria]);

  const nombresProductosParaImagenGeneral = useMemo(() => {
    const names = new Map<string, string>();
    productosParaImagenGeneral.forEach((producto) => {
      const nombre = producto.nombre.trim() || "Sin nombre";
      names.set(nombre.toLocaleLowerCase("es"), nombre);
    });
    return [...names.values()].sort((a, b) => a.localeCompare(b, "es"));
  }, [productosParaImagenGeneral]);

  const tallasParaImagenGeneral = useMemo(() => {
    const tallas = new Set<string>();
    productosParaImagenGeneral.forEach((producto) => {
      producto.variantes.forEach((variante) => {
        if (getVarianteSegundaImagen(variante) && getStockDisponibleVariante(variante) > 0) {
          const talla = variante.talla.trim();
          if (talla) tallas.add(talla);
        }
      });
    });
    return [...tallas].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [productosParaImagenGeneral]);

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

  const openTallaSelector = (producto: Producto) => {
    const tallas = new Set<string>();
    producto.variantes.forEach((variante) => {
      if (getVarianteSegundaImagen(variante) && getStockDisponibleVariante(variante) > 0) {
        const talla = variante.talla.trim();
        if (talla) tallas.add(talla);
      }
    });
    const availableTallas = [...tallas].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    if (availableTallas.length === 0) {
      toast.error("No hay variantes disponibles con segunda imagen");
      return;
    }
    setImageProduct(producto);
    setSelectedTallas(availableTallas);
  };

  const toggleSelectedTalla = (talla: string) => {
    setSelectedTallas((current) =>
      current.includes(talla)
        ? current.filter((value) => value !== talla)
        : [...current, talla]
    );
  };

  const openGeneralImageSelector = () => {
    if (productosParaImagenGeneral.length === 0) {
      toast.error("No hay productos con variantes disponibles y segunda imagen");
      return;
    }
    setSelectedGeneralCategorias(categoriasParaImagenGeneral);
    setSelectedGeneralProductNames(nombresProductosParaImagenGeneral);
    setSelectedGeneralTallas(tallasParaImagenGeneral);
    setGeneralImageOpen(true);
  };

  const toggleGeneralCategory = (categoria: string) => {
    setSelectedGeneralCategorias((current) =>
      current.includes(categoria)
        ? current.filter((value) => value !== categoria)
        : [...current, categoria]
    );
  };

  const toggleGeneralProduct = (productoNombre: string) => {
    setSelectedGeneralProductNames((current) =>
      current.includes(productoNombre)
        ? current.filter((value) => value !== productoNombre)
        : [...current, productoNombre]
    );
  };

  const toggleGeneralTalla = (talla: string) => {
    setSelectedGeneralTallas((current) =>
      current.includes(talla)
        ? current.filter((value) => value !== talla)
        : [...current, talla]
    );
  };

  const handleDownloadVariantsImage = async () => {
    if (!imageProduct) return;
    if (selectedTallas.length === 0) {
      toast.error("Selecciona al menos una talla");
      return;
    }
    const producto = imageProduct;
    setDownloadingImageId(producto._id);
    try {
      await generarImagenVariantesDisponibles(producto, { tallas: selectedTallas });
      toast.success("Imagen de variantes descargada");
      setImageProduct(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar la imagen");
    } finally {
      setDownloadingImageId(null);
    }
  };

  const handleDownloadGeneralVariantsImage = async () => {
    if (selectedGeneralCategorias.length === 0) {
      toast.error("Selecciona al menos una categoria");
      return;
    }
    if (selectedGeneralProductNames.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }
    if (selectedGeneralTallas.length === 0) {
      toast.error("Selecciona al menos una talla");
      return;
    }
    const categoriasSeleccionadas = new Set(selectedGeneralCategorias);
    const productosSeleccionados = new Set(selectedGeneralProductNames.map((nombre) => nombre.toLocaleLowerCase("es")));
    const selectedProductIds = productosParaImagenGeneral
      .filter((producto) => categoriasSeleccionadas.has(producto.categoria?.trim() || "Sin categoria"))
      .filter((producto) => productosSeleccionados.has((producto.nombre.trim() || "Sin nombre").toLocaleLowerCase("es")))
      .map((producto) => producto._id);
    if (selectedProductIds.length === 0) {
      toast.error("No hay modelos disponibles para esa seleccion");
      return;
    }
    setDownloadingImageId("GENERAL");
    try {
      await generarImagenGeneralVariantesDisponibles(productos, {
        productoIds: selectedProductIds,
        tallas: selectedGeneralTallas,
      });
      toast.success("Imagen general descargada");
      setGeneralImageOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar la imagen general");
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
          <button className="btn-secondary" disabled={!productosParaImagenGeneral.length || downloadingImageId === "GENERAL"} onClick={openGeneralImageSelector}>{downloadingImageId === "GENERAL" ? "Generando..." : "Imagen general"}</button>
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
                  <button className="btn-link mr-3" disabled={downloadingImageId === producto._id} onClick={() => openTallaSelector(producto)}>{downloadingImageId === producto._id ? "Generando..." : "Imagen variantes"}</button>
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
      {imageProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Elegir tallas</h2>
              <p className="mt-1 text-sm text-gray-400">{imageProduct.nombre} - {imageProduct.modelo}</p>
            </div>
            <div className="mb-4 flex gap-3">
              <button type="button" className="btn-secondary" onClick={() => setSelectedTallas(imageProductTallas)}>Todas</button>
              <button type="button" className="btn-secondary" onClick={() => setSelectedTallas([])}>Limpiar</button>
            </div>
            <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto pr-1">
              {imageProductTallas.map((talla) => (
                <label key={talla} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedTallas.includes(talla)}
                    onChange={() => toggleSelectedTalla(talla)}
                    className="h-4 w-4"
                  />
                  <span>Talla {talla}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setImageProduct(null)}>Cancelar</button>
              <button type="button" className="btn-primary" disabled={selectedTallas.length === 0 || downloadingImageId === imageProduct._id} onClick={() => void handleDownloadVariantsImage()}>
                {downloadingImageId === imageProduct._id ? "Generando..." : "Descargar imagen"}
              </button>
            </div>
          </div>
        </div>
      )}
      {generalImageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Imagen general de variantes</h2>
              <p className="mt-1 text-sm text-gray-400">Elige categorias, productos y tallas que quieres incluir.</p>
            </div>
            <div className="grid gap-6 xl:grid-cols-[240px_1fr_280px]">
              <section>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-medium text-white">Categorias</h3>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setSelectedGeneralCategorias(categoriasParaImagenGeneral)}>Todas</button>
                    <button type="button" className="btn-secondary" onClick={() => setSelectedGeneralCategorias([])}>Limpiar</button>
                  </div>
                </div>
                <div className="grid max-h-96 gap-3 overflow-y-auto pr-1">
                  {categoriasParaImagenGeneral.map((categoria) => (
                    <label key={categoria} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedGeneralCategorias.includes(categoria)}
                        onChange={() => toggleGeneralCategory(categoria)}
                        className="h-4 w-4"
                      />
                      <span>{categoria}</span>
                    </label>
                  ))}
                </div>
              </section>
              <section>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-medium text-white">Productos</h3>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setSelectedGeneralProductNames(gruposProductosParaImagenGeneral.map((group) => group.nombre))}>Todos</button>
                    <button type="button" className="btn-secondary" onClick={() => setSelectedGeneralProductNames([])}>Limpiar</button>
                  </div>
                </div>
                <div className="grid max-h-96 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
                  {gruposProductosParaImagenGeneral.map((grupo) => (
                    <label key={grupo.nombre} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedGeneralProductNames.includes(grupo.nombre)}
                        onChange={() => toggleGeneralProduct(grupo.nombre)}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        <span className="block font-medium text-white">{grupo.nombre}</span>
                        <span className="block text-gray-400">{grupo.modelos.length} {grupo.modelos.length === 1 ? "modelo" : "modelos"}</span>
                      </span>
                    </label>
                  ))}
                  {gruposProductosParaImagenGeneral.length === 0 && (
                    <p className="col-span-full rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-sm text-gray-400">No hay productos para las categorias seleccionadas.</p>
                  )}
                </div>
              </section>
              <section>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-medium text-white">Tallas</h3>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setSelectedGeneralTallas(tallasParaImagenGeneral)}>Todas</button>
                    <button type="button" className="btn-secondary" onClick={() => setSelectedGeneralTallas([])}>Limpiar</button>
                  </div>
                </div>
                <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-2">
                  {tallasParaImagenGeneral.map((talla) => (
                    <label key={talla} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedGeneralTallas.includes(talla)}
                        onChange={() => toggleGeneralTalla(talla)}
                        className="h-4 w-4"
                      />
                      <span>Talla {talla}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => setGeneralImageOpen(false)}>Cancelar</button>
              <button type="button" className="btn-primary" disabled={downloadingImageId === "GENERAL"} onClick={() => void handleDownloadGeneralVariantsImage()}>
                {downloadingImageId === "GENERAL" ? "Generando..." : "Descargar imagen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
