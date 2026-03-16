"use client";

import { useEffect, useState } from "react";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { getProductos } from "@/services/producto.service";
import { Producto } from "@/types/producto";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";

export default function VendedorProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setProductos(await getProductos());
      } finally {
        setLoading(false);
      }
    };

    load();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalogo de productos</h1>
          <p className="mt-1 text-sm text-gray-400">
            Consulta variantes y disponibilidad antes de registrar una venta.
          </p>
        </div>
        
      </div>
      <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, modelo, SKU o variante..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40 lg:w-full"
        />
      <div className="grid gap-4 xl:grid-cols-2">
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}

        {!loading &&
          filteredProductos.map((producto) => {
            const portada = getVarianteImagenPrincipal(producto.variantes[0]);
            const stockTotal = producto.variantes.reduce(
              (total, variante) => total + variante.stock,
              0
            );

            return (
              <article
                key={producto._id}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_20px_rgba(0,180,255,0.08)]"
              >
                {portada ? (
                  <CloudinaryImage
                    src={portada}
                    alt={producto.nombre}
                    width={120}
                    height={120}
                    className="h-28 w-28 rounded-xl object-cover"
                  />
                ) : (
                  <div className="surface-placeholder flex h-28 w-28 items-center justify-center rounded-xl text-sm">
                    Sin imagen
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {producto.nombre}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {producto.modelo} - SKU {producto.sku}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                      {producto.variantes.length} variantes
                    </span>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                      Stock total {stockTotal}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                      Venta Bs {producto.precioVenta}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                    {producto.variantes.map((variante) => (
                      <span
                        key={`${producto._id}-${variante.color}-${variante.talla}`}
                        className="surface-chip rounded-full px-3 py-1"
                      >
                        {variante.color} / {variante.talla} - {variante.stock}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      {!loading && filteredProductos.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
          No hay productos que coincidan con la busqueda.
        </div>
      )}
    </div>
  );
}
