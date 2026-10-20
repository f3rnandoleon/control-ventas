"use client";

import { useState, useMemo, useEffect } from "react";
import type { ProductoInventario } from "@/types/inventario";
import type { Variante } from "@/types/producto";
import { formatMoney } from "@/utils/pricing";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { useAuth } from "@/context/AuthContext";
import VarianteDetalleDrawer from "./VarianteDetalleDrawer";

interface StockJerarquicoViewProps {
  productos: ProductoInventario[];
  searchTerm?: string;
}

export default function StockJerarquicoView({
  productos,
  searchTerm: initialSearch = "",
}: StockJerarquicoViewProps) {
  const { user } = useAuth();
  const isAdmin = user?.rol === "ADMIN";

  // Estados de filtros
  const [search, setSearch] = useState(initialSearch);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("TODAS");
  const [colorSeleccionado, setColorSeleccionado] = useState<string>("TODOS");
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string>("TODAS");
  const [estadoStockFiltro, setEstadoStockFiltro] = useState<"TODOS" | "NORMAL" | "BAJO" | "AGOTADO">("TODOS");
  const [ordenarPor, setOrdenarPor] = useState<"nombre" | "stockDesc" | "stockAsc">("nombre");

  // Expandir / colapsar productos
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  // Drawer de análisis de variante
  const [drawerVariante, setDrawerVariante] = useState<{
    producto: ProductoInventario;
    variante: Variante;
  } | null>(null);

  // Tipo de cambio público
  const [tipoCambioOficial, setTipoCambioOficial] = useState<number>(1.85);

  useEffect(() => {
    fetch("/api/public/politicas")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tipoCambioOficial) {
          setTipoCambioOficial(data.tipoCambioOficial);
        }
      })
      .catch(() => {});
  }, []);

  // Extraer categorías únicas
  const categorias = useMemo(() => {
    const cats = new Set<string>();
    for (const p of productos) {
      if (p.categoria) cats.add(p.categoria);
    }
    return ["TODAS", ...Array.from(cats).sort()];
  }, [productos]);

  // Extraer colores y tallas únicos
  const { colores, tallas } = useMemo(() => {
    const colorSet = new Set<string>();
    const tallaSet = new Set<string>();
    for (const p of productos) {
      for (const v of p.variantes || []) {
        if (v.color) colorSet.add(v.color.trim());
        if (v.talla) tallaSet.add(v.talla.trim());
      }
    }
    return {
      colores: ["TODOS", ...Array.from(colorSet).sort()],
      tallas: ["TODAS", ...Array.from(tallaSet).sort()],
    };
  }, [productos]);

  // Función de estado de stock para una variante o producto
  const calcularEstadoStock = (stock: number, stockMinimo: number = 2) => {
    if (stock <= 0) return "AGOTADO";
    if (stock <= stockMinimo) return "BAJO";
    return "NORMAL";
  };

  // Filtrado Jerárquico: Producto -> Variantes
  const productosFiltrados = useMemo(() => {
    const query = search.trim().toLowerCase();

    return productos
      .map((producto) => {
        // Filtrar categorías
        if (categoriaSeleccionada !== "TODAS" && producto.categoria !== categoriaSeleccionada) {
          return null;
        }

        // Filtrar variantes internas del producto según color, talla y estado
        const variantesCoincidentes = (producto.variantes || []).filter((v) => {
          // Filtro Color
          if (colorSeleccionado !== "TODOS" && v.color.toLowerCase() !== colorSeleccionado.toLowerCase()) {
            return false;
          }
          // Filtro Talla
          if (tallaSeleccionada !== "TODAS" && v.talla.toLowerCase() !== tallaSeleccionada.toLowerCase()) {
            return false;
          }
          // Filtro Estado de Stock
          const stockFisico = Number(v.stock || 0);
          const estado = calcularEstadoStock(stockFisico, producto.stockMinimo || 2);
          if (estadoStockFiltro !== "TODOS" && estado !== estadoStockFiltro) {
            return false;
          }
          // Si hay búsqueda por texto, verificar si coincide en el producto O en la variante
          if (query) {
            const matchProducto = [producto.nombre, producto.modelo, producto.sku]
              .filter(Boolean)
              .some((f) => f.toLowerCase().includes(query));
            const matchVariante = [v.color, v.colorSecundario, v.talla, v.codigoBarra]
              .filter(Boolean)
              .some((f) => (f as string).toLowerCase().includes(query));

            return matchProducto || matchVariante;
          }

          return true;
        });

        // Si el producto no tiene variantes que pasen los filtros específicos, excluirlo
        if (variantesCoincidentes.length === 0) {
          return null;
        }

        // Stock total de las variantes filtradas
        const stockFiltrado = variantesCoincidentes.reduce(
          (acc, v) => acc + Number(v.stock || 0),
          0
        );

        return {
          ...producto,
          variantesFiltradas: variantesCoincidentes,
          stockTotalFiltrado: stockFiltrado,
        };
      })
      .filter((p): p is (ProductoInventario & { variantesFiltradas: Variante[]; stockTotalFiltrado: number }) => p !== null)
      .sort((a, b) => {
        if (ordenarPor === "stockDesc") {
          return b.stockTotalFiltrado - a.stockTotalFiltrado;
        }
        if (ordenarPor === "stockAsc") {
          return a.stockTotalFiltrado - b.stockTotalFiltrado;
        }
        return a.nombre.localeCompare(b.nombre);
      });
  }, [
    productos,
    search,
    categoriaSeleccionada,
    colorSeleccionado,
    tallaSeleccionada,
    estadoStockFiltro,
    ordenarPor,
  ]);

  // Métricas Consolidadas para KPIs
  const metricas = useMemo(() => {
    let totalPrendas = 0;
    let totalVariantesCount = 0;
    let variantesBajoStock = 0;
    let variantesAgotadas = 0;
    let capitalInvertidoCPP = 0;
    let valorPotencialVenta = 0;

    for (const p of productos) {
      for (const v of p.variantes || []) {
        totalVariantesCount += 1;
        const stock = Number(v.stock || 0);
        totalPrendas += stock;

        const cpp = Number(v.precioCosto || p.precioCosto || 0);
        const pv = Number(v.precioVenta || p.precioVenta || 0);

        capitalInvertidoCPP += stock * cpp;
        valorPotencialVenta += stock * pv;

        if (stock === 0) {
          variantesAgotadas += 1;
        } else if (stock <= (p.stockMinimo || 2)) {
          variantesBajoStock += 1;
        }
      }
    }

    return {
      totalProductos: productos.length,
      totalVariantes: totalVariantesCount,
      totalPrendas,
      variantesBajoStock,
      variantesAgotadas,
      capitalInvertidoCPP,
      valorPotencialVenta,
    };
  }, [productos]);

  const toggleExpand = (prodId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [prodId]: !prev[prodId],
    }));
  };

  const handleToggleExpandAll = () => {
    const todosExpandidos = productosFiltrados.every((p) => expandedProducts[p._id]);
    const newState: Record<string, boolean> = {};
    for (const p of productosFiltrados) {
      newState[p._id] = !todosExpandidos;
    }
    setExpandedProducts(newState);
  };

  return (
    <div className="space-y-6">
      {/* 1. BARRA DE MÉTRICAS / KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_15px_rgba(0,180,255,0.06)]">
          <span className="text-xs text-gray-400 block">Productos Activos</span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {metricas.totalProductos}
          </span>
          <span className="text-[11px] text-gray-400">
            en {categorias.length - 1} categorías
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_15px_rgba(0,180,255,0.06)]">
          <span className="text-xs text-gray-400 block">Total Variantes</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1 block">
            {metricas.totalVariantes}
          </span>
          <span className="text-[11px] text-gray-400">combinaciones color/talla</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_15px_rgba(0,180,255,0.06)]">
          <span className="text-xs text-gray-400 block">Prendas en Stock</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
            {metricas.totalPrendas} u.
          </span>
          <span className="text-[11px] text-gray-400">existencia física total</span>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4">
          <span className="text-xs text-amber-300 block">Alertas de Stock</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-400">
              {metricas.variantesBajoStock}
            </span>
            <span className="text-xs text-amber-200/80">bajas</span>
            <span className="text-gray-500">•</span>
            <span className="text-2xl font-bold text-rose-400">
              {metricas.variantesAgotadas}
            </span>
            <span className="text-xs text-rose-300/80">agotadas</span>
          </div>
          <span className="text-[11px] text-amber-400/80">requieren reposición</span>
        </div>

        {isAdmin && (
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4">
            <span className="text-xs text-emerald-300 block">Capital Valorizado (CPP)</span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-300 mt-1 block font-mono">
              {formatMoney(metricas.capitalInvertidoCPP)}
            </span>
            <span className="text-[11px] text-emerald-400/80">
              Venta est.: {formatMoney(metricas.valorPotencialVenta)}
            </span>
          </div>
        )}
      </div>

      {/* 2. PANEL DE FILTROS FACETADOS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* BUSCADOR */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por producto, modelo, SKU, color, talla o código de barra..."
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400 transition"
            />
          </div>

          {/* ORDENAR Y EXPANDIR */}
          <div className="flex items-center gap-2.5">
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value as "nombre" | "stockDesc" | "stockAsc")}
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-medium text-gray-300 outline-none focus:border-cyan-500"
            >
              <option value="nombre">Ordenar: Nombre A-Z</option>
              <option value="stockDesc">Ordenar: Mayor Stock</option>
              <option value="stockAsc">Ordenar: Menor Stock</option>
            </select>

            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition whitespace-nowrap cursor-pointer"
            >
              {productosFiltrados.every((p) => expandedProducts[p._id])
                ? "Colapsar Todos"
                : "Expandir Todos"}
            </button>
          </div>
        </div>

        {/* FILTROS POR CARACTERÍSTICAS (CATEGORÍA, COLOR, TALLA, ESTADO) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Categoría
            </label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-gray-300 outline-none focus:border-cyan-500"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "TODAS" ? "🏷️ Todas las categorías" : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Color
            </label>
            <select
              value={colorSeleccionado}
              onChange={(e) => setColorSeleccionado(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-gray-300 outline-none focus:border-cyan-500 capitalize"
            >
              {colores.map((c) => (
                <option key={c} value={c}>
                  {c === "TODOS" ? "🎨 Todos los colores" : c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Talla
            </label>
            <select
              value={tallaSeleccionada}
              onChange={(e) => setTallaSeleccionada(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-gray-300 outline-none focus:border-cyan-500 font-mono"
            >
              {tallas.map((t) => (
                <option key={t} value={t}>
                  {t === "TODAS" ? "📏 Todas las tallas" : `Talla ${t}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Nivel de Stock
            </label>
            <select
              value={estadoStockFiltro}
              onChange={(e) => setEstadoStockFiltro(e.target.value as "TODOS" | "NORMAL" | "BAJO" | "AGOTADO")}
              className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-gray-300 outline-none focus:border-cyan-500"
            >
              <option value="TODOS">📦 Todos los niveles</option>
              <option value="NORMAL">🟢 Stock Normal</option>
              <option value="BAJO">🟡 Stock Bajo Mínimo</option>
              <option value="AGOTADO">🔴 Sin Existencias</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. LISTA JERÁRQUICA: PRODUCTO -> VARIANTES */}
      {productosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-base font-medium text-gray-200">
            No se encontraron productos o variantes con los filtros seleccionados
          </p>
          <p className="text-xs mt-1">
            Prueba a limpiar la búsqueda o cambiar los filtros de categoría, color y talla.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoriaSeleccionada("TODAS");
              setColorSeleccionado("TODOS");
              setTallaSeleccionada("TODAS");
              setEstadoStockFiltro("TODOS");
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition cursor-pointer"
          >
            Restablecer todos los filtros
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {productosFiltrados.map((producto) => {
            const isExpanded = Boolean(expandedProducts[producto._id]);
            const imagenPrincipal = producto.variantes?.[0] ? (getVarianteImagenPrincipal(producto.variantes[0]) || "") : "";
            const totalVariantes = producto.variantesFiltradas.length;

            return (
              <div
                key={producto._id}
                className="rounded-2xl border border-white/10 bg-slate-900/70 overflow-hidden shadow-lg transition hover:border-white/20"
              >
                {/* FILA MAESTRO (PRODUCTO) */}
                <div
                  onClick={() => toggleExpand(producto._id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-xl border border-white/10 bg-black/40 flex-shrink-0">
                      {imagenPrincipal ? (
                        <CloudinaryImage
                          src={imagenPrincipal}
                          alt={producto.nombre}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-gray-500">
                          👕
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold uppercase text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                          {producto.sku}
                        </span>
                        {producto.categoria && (
                          <span className="text-[11px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {producto.categoria}
                          </span>
                        )}
                        {producto.modelo && (
                          <span className="text-[11px] text-gray-400">
                            Mod: {producto.modelo}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {producto.nombre}
                      </h3>
                      <p className="text-xs text-gray-400">
                        Precio Ref:{" "}
                        <span className="text-white font-semibold">
                          {formatMoney(producto.precioVenta)}
                        </span>
                        {isAdmin && producto.precioCosto > 0 && (
                          <span className="ml-2 text-emerald-400/90 font-mono text-[11px]">
                            (CPP Base: {formatMoney(producto.precioCosto)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-gray-400 block">
                        Stock del Producto
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-white">
                          {producto.stockTotalFiltrado} u.
                        </span>
                        <span className="text-xs text-cyan-300 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                          {totalVariantes} {totalVariantes === 1 ? "variante" : "variantes"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 transition"
                    >
                      <span>{isExpanded ? "Ocultar" : "Ver Variantes"}</span>
                      <span className="text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                  </div>
                </div>

                {/* SUB-NIVEL DETALLE: VARIANTES DEL PRODUCTO */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/30 p-4 sm:p-5 animate-in fade-in duration-150">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-gray-300">
                        <thead className="text-gray-400 border-b border-white/10 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3 py-2 text-left">Foto</th>
                            <th className="px-3 py-2 text-left">Color</th>
                            <th className="px-3 py-2 text-center">Talla</th>
                            <th className="px-3 py-2 text-left">Código / QR</th>
                            <th className="px-3 py-2 text-center">Físico</th>
                            <th className="px-3 py-2 text-center">Reservado</th>
                            <th className="px-3 py-2 text-center">Disponible</th>
                            <th className="px-3 py-2 text-center">Estado</th>
                            <th className="px-3 py-2 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {producto.variantesFiltradas.map((variante, idx) => {
                            const varImg = getVarianteImagenPrincipal(variante) || imagenPrincipal;
                            const stockFis = Number(variante.stock || 0);
                            const stockRes = Number(variante.stockReservado || 0);
                            const stockDisp = Math.max(0, stockFis - stockRes);
                            const estado = calcularEstadoStock(stockDisp, producto.stockMinimo || 2);

                            return (
                              <tr
                                key={variante.varianteId || idx}
                                className="hover:bg-white/[0.04] transition"
                              >
                                <td className="px-3 py-2.5">
                                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-black/40 flex-shrink-0">
                                    {varImg ? (
                                      <CloudinaryImage
                                        src={varImg}
                                        alt={variante.color}
                                        width={50}
                                        height={50}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                                        👟
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="px-3 py-2.5 font-medium text-white capitalize">
                                  {variante.color}
                                  {variante.colorSecundario && (
                                    <span className="text-[10px] text-gray-400 block">
                                      / {variante.colorSecundario}
                                    </span>
                                  )}
                                </td>

                                <td className="px-3 py-2.5 text-center font-mono font-bold text-cyan-300">
                                  {variante.talla}
                                </td>

                                <td className="px-3 py-2.5 font-mono text-[11px] text-gray-400">
                                  {variante.codigoBarra || "Sin código"}
                                </td>

                                <td className="px-3 py-2.5 text-center font-semibold text-gray-200">
                                  {stockFis} u.
                                </td>

                                <td className="px-3 py-2.5 text-center text-amber-300 font-mono">
                                  {stockRes > 0 ? `${stockRes} u.` : "-"}
                                </td>

                                <td className="px-3 py-2.5 text-center font-extrabold text-cyan-300 font-mono text-sm">
                                  {stockDisp} u.
                                </td>

                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                      estado === "AGOTADO"
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                        : estado === "BAJO"
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    }`}
                                  >
                                    {estado === "AGOTADO"
                                      ? "Sin Stock"
                                      : estado === "BAJO"
                                      ? "Bajo"
                                      : "Normal"}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDrawerVariante({ producto, variante });
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>🔍</span> Ver Análisis
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. DRAWER DETALLE LATERAL DE VARIANTE */}
      {drawerVariante && (
        <VarianteDetalleDrawer
          producto={drawerVariante.producto}
          variante={drawerVariante.variante}
          tipoCambioOficial={tipoCambioOficial}
          onClose={() => setDrawerVariante(null)}
        />
      )}
    </div>
  );
}
