"use client";

import { useEffect, useState } from "react";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { getProductos } from "@/services/producto.service";
import { Producto } from "@/types/producto";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import { formatProductPriceDisplay } from "@/utils/pricing";
import ColorSwatch from "@/components/ui/ColorSwatch";

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
                className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_20px_rgba(0,180,255,0.08)] hover:border-cyan-500/20 transition-all"
              >
                <div className="flex items-center gap-3 sm:block shrink-0">
                  {portada ? (
                    <CloudinaryImage
                      src={portada}
                      alt={producto.nombre}
                      width={120}
                      height={120}
                      className="h-20 w-20 sm:h-28 sm:w-28 rounded-xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="surface-placeholder flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center rounded-xl text-xs sm:text-sm">
                      👕 Sin imagen
                    </div>
                  )}

                  {/* En móvil: mostrar título al lado de la imagen */}
                  <div className="sm:hidden min-w-0 flex-1">
                    <h2 className="text-base font-bold text-white truncate">
                      {producto.nombre}
                    </h2>
                    <p className="text-xs text-gray-400 truncate">
                      {producto.modelo || "Sin modelo"} • SKU {producto.sku}
                    </p>
                    <span className="inline-block mt-1 text-xs font-bold text-emerald-400">
                      {formatProductPriceDisplay(producto)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  {/* En escritorio: título */}
                  <div className="hidden sm:block">
                    <h2 className="text-lg font-semibold text-white">
                      {producto.nombre}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {producto.modelo} - SKU {producto.sku}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-cyan-300 font-medium">
                      🏷️ {producto.variantes.length} variantes
                    </span>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300 font-medium">
                      Stock: {stockTotal} u.
                    </span>
                    <span className="hidden sm:inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-slate-300">
                      Venta {formatProductPriceDisplay(producto)}
                    </span>
                  </div>

                  {/* Lista de variantes mejorada con badges y stock */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {producto.variantes.map((variante) => {
                      const stockVal = variante.stock || 0;
                      return (
                        <div
                          key={`${producto._id}-${variante.color}-${variante.talla}`}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs"
                        >
                          <ColorSwatch colorName={variante.color} className="h-2.5 w-2.5" />
                          <span className="text-slate-200 capitalize font-medium">
                            {variante.color}
                          </span>
                          <span className="rounded bg-sky-950 text-cyan-300 px-1 py-0.2 text-[10px] font-mono font-bold">
                            {variante.talla}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              stockVal === 0
                                ? "text-rose-400"
                                : stockVal <= 3
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            ({stockVal})
                          </span>
                        </div>
                      );
                    })}
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
