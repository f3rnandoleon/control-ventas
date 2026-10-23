"use client";

import { useState, useMemo, useEffect } from "react";
import type { ProductoInventario } from "@/types/inventario";
import type { Variante } from "@/types/producto";
import type { Sucursal } from "@/types/sucursal";
import { getSucursales } from "@/services/sucursales.service";
import { formatMoney } from "@/utils/pricing";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { useAuth } from "@/context/AuthContext";
import VarianteDetalleDrawer from "./VarianteDetalleDrawer";
import AjusteStockModal from "./AjusteStockModal";

interface StockJerarquicoViewProps {
  productos: ProductoInventario[];
  searchTerm?: string;
  onStockUpdated?: () => void;
}

export default function StockJerarquicoView({
  productos,
  searchTerm: initialSearch = "",
  onStockUpdated,
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

  // Filtro de sucursal
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalSeleccionadaId, setSucursalSeleccionadaId] = useState<string>("TODAS");

  // Expandir / colapsar productos
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  // Drawer de análisis de variante
  const [drawerVariante, setDrawerVariante] = useState<{
    producto: ProductoInventario;
    variante: Variante;
  } | null>(null);

  // Modal de ajuste directo de stock
  const [ajusteTarget, setAjusteTarget] = useState<{
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

    getSucursales()
      .then((data) => setSucursales(data.filter((s) => s.activa)))
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

  // Función helper para obtener stock físico y disponible de una variante según la sucursal elegida
  const getStockVarianteSegunSucursal = (v: Variante, sId: string) => {
    if (sId === "TODAS" || !v.sucursalesStock || v.sucursalesStock.length === 0) {
      const fisico = Number(v.stock || 0);
      const reservado = Number(v.stockReservado || 0);
      return {
        fisico,
        reservado,
        disponible: Math.max(0, fisico - reservado),
      };
    }
    const sInfo = v.sucursalesStock.find((s) => s.sucursalId === sId);
    const fisico = sInfo ? Math.max(0, Number(sInfo.stockFisico || 0)) : 0;
    const reservado = sInfo ? Math.max(0, Number(sInfo.stockReservado || 0)) : 0;
    return {
      fisico,
      reservado,
      disponible: Math.max(0, fisico - reservado),
    };
  };

  // Función de estado de stock para una variante o producto
  const calcularEstadoStock = (stock: number, stockMinimo: number = 2) => {
    if (stock <= 0) return "AGOTADO";
    if (stock <= stockMinimo) return "BAJO";
    return "NORMAL";
  };

  // Filtrado Jerárquico: Producto -> Variantes (considerando la sucursal activa)
  const productosFiltrados = useMemo(() => {
    const query = search.trim().toLowerCase();

    return productos
      .map((producto) => {
        // Filtrar categorías
        if (categoriaSeleccionada !== "TODAS" && producto.categoria !== categoriaSeleccionada) {
          return null;
        }

        // Filtrar variantes internas del producto según color, talla, estado y sucursal
        const variantesCoincidentes = (producto.variantes || []).filter((v) => {
          // Filtro Color
          if (colorSeleccionado !== "TODOS" && v.color.toLowerCase() !== colorSeleccionado.toLowerCase()) {
            return false;
          }
          // Filtro Talla
          if (tallaSeleccionada !== "TODAS" && v.talla.toLowerCase() !== tallaSeleccionada.toLowerCase()) {
            return false;
          }
          // Filtro Estado de Stock con base en la sucursal elegida
          const stockData = getStockVarianteSegunSucursal(v, sucursalSeleccionadaId);
          const estado = calcularEstadoStock(stockData.disponible, producto.stockMinimo || 2);
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

        // Stock total de las variantes filtradas para la sucursal seleccionada
        const stockFiltrado = variantesCoincidentes.reduce(
          (acc, v) => acc + getStockVarianteSegunSucursal(v, sucursalSeleccionadaId).fisico,
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
    sucursalSeleccionadaId,
    ordenarPor,
  ]);

  // Nombre de la sucursal seleccionada para el badge en KPIs
  const sucursalNombreActual = useMemo(() => {
    if (sucursalSeleccionadaId === "TODAS") return "Consolidado Global";
    const s = sucursales.find((item) => item._id === sucursalSeleccionadaId);
    return s ? `${s.nombre} (${s.codigo})` : "Sucursal";
  }, [sucursalSeleccionadaId, sucursales]);

  // Métricas Consolidadas para KPIs según la sucursal activa
  const metricas = useMemo(() => {
    let totalPrendas = 0;
    let totalVariantesCount = 0;
    let variantesBajoStock = 0;
    let variantesAgotadas = 0;
    let capitalInvertidoCPP = 0;
    let valorPotencialVenta = 0;
    let productosConStock = 0;

    for (const p of productos) {
      let prodTieneStock = false;
      for (const v of p.variantes || []) {
        totalVariantesCount += 1;
        const stockData = getStockVarianteSegunSucursal(v, sucursalSeleccionadaId);
        const stock = stockData.fisico;
        totalPrendas += stock;
        if (stock > 0) prodTieneStock = true;

        const cpp = Number(v.precioCosto || p.precioCosto || 0);
        const pv = Number(v.precioVenta || p.precioVenta || 0);

        capitalInvertidoCPP += stock * cpp;
        valorPotencialVenta += stock * pv;

        if (stockData.disponible === 0) {
          variantesAgotadas += 1;
        } else if (stockData.disponible <= (p.stockMinimo || 2)) {
          variantesBajoStock += 1;
        }
      }
      if (prodTieneStock) productosConStock += 1;
    }

    return {
      totalProductos: productos.length,
      productosConStock,
      totalVariantes: totalVariantesCount,
      totalPrendas,
      variantesBajoStock,
      variantesAgotadas,
      capitalInvertidoCPP,
      valorPotencialVenta,
    };
  }, [productos, sucursalSeleccionadaId]);

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
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-600 dark:bg-cyan-500/10 dark:text-cyan-400 text-xs">
            🏢
          </span>
          <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">Existencias calculadas para:</span>
          <span className="rounded-full bg-sky-100 border border-sky-300 px-3 py-0.5 text-xs font-bold text-sky-800 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300 shadow-sm">
            {sucursalNombreActual}
          </span>
        </div>
        {sucursalSeleccionadaId !== "TODAS" && (
          <button
            type="button"
            onClick={() => setSucursalSeleccionadaId("TODAS")}
            className="text-xs text-sky-600 hover:text-sky-700 dark:text-cyan-400 dark:hover:text-cyan-300 underline font-medium cursor-pointer"
          >
            Ver consolidado global
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 shadow-sm dark:shadow-[0_0_15px_rgba(0,180,255,0.06)] transition-colors">
          <span className="text-xs text-slate-500 dark:text-gray-400 block font-medium">Productos Activos</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {metricas.totalProductos}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-gray-400">
            {metricas.productosConStock} con stock en esta sucursal
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 shadow-sm dark:shadow-[0_0_15px_rgba(0,180,255,0.06)] transition-colors">
          <span className="text-xs text-slate-500 dark:text-gray-400 block font-medium">Total Variantes</span>
          <span className="text-2xl font-bold text-sky-600 dark:text-cyan-400 mt-1 block">
            {metricas.totalVariantes}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-gray-400">combinaciones color/talla</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 shadow-sm dark:shadow-[0_0_15px_rgba(0,180,255,0.06)] transition-colors">
          <span className="text-xs text-slate-500 dark:text-gray-400 block font-medium">Prendas en Stock</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {metricas.totalPrendas} u.
          </span>
          <span className="text-[11px] text-slate-500 dark:text-gray-400">existencia física en {sucursalSeleccionadaId === "TODAS" ? "todas las sucursales" : "esta sucursal"}</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-950/10 p-4 transition-colors">
          <span className="text-xs text-amber-800 dark:text-amber-300 block font-semibold">Alertas de Stock</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {metricas.variantesBajoStock}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-200/80 font-medium">bajas</span>
            <span className="text-slate-400 dark:text-gray-500">•</span>
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {metricas.variantesAgotadas}
            </span>
            <span className="text-xs text-rose-700 dark:text-rose-300/80 font-medium">agotadas</span>
          </div>
          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">en la sucursal activa</span>
        </div>

        {isAdmin && (
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-950/15 p-4 transition-colors">
            <span className="text-xs text-emerald-800 dark:text-emerald-300 block font-semibold">Capital Valorizado (CPP)</span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 block font-mono">
              {formatMoney(metricas.capitalInvertidoCPP)}
            </span>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
              Venta est.: {formatMoney(metricas.valorPotencialVenta)}
            </span>
          </div>
        )}
      </div>

      {/* 2. PANEL DE FILTROS FACETADOS */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-5 space-y-4 shadow-sm dark:shadow-xl backdrop-blur-md transition-colors">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* BUSCADOR */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por producto, modelo, SKU, color, talla o código de barra..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none focus:border-sky-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-slate-900 transition"
            />
          </div>

          {/* ORDENAR Y EXPANDIR */}
          <div className="flex items-center gap-2.5">
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value as "nombre" | "stockDesc" | "stockAsc")}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 outline-none focus:border-sky-500 dark:focus:border-cyan-500 cursor-pointer"
            >
              <option value="nombre">Ordenar: Nombre A-Z</option>
              <option value="stockDesc">Ordenar: Mayor Stock</option>
              <option value="stockAsc">Ordenar: Menor Stock</option>
            </select>

            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-gray-300 transition whitespace-nowrap cursor-pointer active:scale-95"
            >
              {productosFiltrados.every((p) => expandedProducts[p._id])
                ? "Colapsar Todos"
                : "Expandir Todos"}
            </button>
          </div>
        </div>

        {/* FILTROS POR CARACTERÍSTICAS (SUCURSAL, CATEGORÍA, COLOR, TALLA, ESTADO) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-sky-700 dark:text-cyan-300 uppercase tracking-wider mb-1">
              🏢 Sucursal
            </label>
            <select
              value={sucursalSeleccionadaId}
              onChange={(e) => setSucursalSeleccionadaId(e.target.value)}
              className="w-full rounded-lg border border-sky-300 dark:border-cyan-500/30 bg-sky-50/60 dark:bg-slate-900 p-2 text-sky-900 dark:text-cyan-200 font-bold outline-none focus:border-sky-500 dark:focus:border-cyan-400 cursor-pointer"
            >
              <option value="TODAS">🌐 Todas las Sucursales</option>
              {sucursales.map((s) => (
                <option key={s._id} value={s._id}>
                  📍 {s.nombre} ({s.codigo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1">
              Categoría
            </label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-2 text-slate-800 dark:text-gray-300 font-medium outline-none focus:border-sky-500 dark:focus:border-cyan-500 cursor-pointer"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "TODAS" ? "🏷️ Todas las categorías" : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1">
              Color
            </label>
            <select
              value={colorSeleccionado}
              onChange={(e) => setColorSeleccionado(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-2 text-slate-800 dark:text-gray-300 font-medium outline-none focus:border-sky-500 dark:focus:border-cyan-500 capitalize cursor-pointer"
            >
              {colores.map((c) => (
                <option key={c} value={c}>
                  {c === "TODOS" ? "🎨 Todos los colores" : c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1">
              Talla
            </label>
            <select
              value={tallaSeleccionada}
              onChange={(e) => setTallaSeleccionada(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-2 text-slate-800 dark:text-gray-300 font-bold font-mono outline-none focus:border-sky-500 dark:focus:border-cyan-500 cursor-pointer"
            >
              {tallas.map((t) => (
                <option key={t} value={t}>
                  {t === "TODAS" ? "📏 Todas las tallas" : `Talla ${t}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1">
              Nivel de Stock
            </label>
            <select
              value={estadoStockFiltro}
              onChange={(e) => setEstadoStockFiltro(e.target.value as "TODOS" | "NORMAL" | "BAJO" | "AGOTADO")}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-2 text-slate-800 dark:text-gray-300 font-medium outline-none focus:border-sky-500 dark:focus:border-cyan-500 cursor-pointer"
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
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-12 text-center text-slate-500 dark:text-gray-400 shadow-sm">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-base font-semibold text-slate-800 dark:text-gray-200">
            No se encontraron productos o variantes con los filtros seleccionados
          </p>
          <p className="text-xs mt-1 text-slate-500 dark:text-gray-400">
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
            className="mt-4 px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 dark:text-cyan-400 text-xs font-bold border border-sky-200 dark:border-cyan-500/20 transition cursor-pointer"
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
                className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70 overflow-hidden shadow-sm hover:border-sky-300 dark:hover:border-white/20 transition"
              >
                {/* FILA MAESTRO (PRODUCTO) */}
                <div
                  onClick={() => toggleExpand(producto._id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 flex-shrink-0">
                      {imagenPrincipal ? (
                        <CloudinaryImage
                          src={imagenPrincipal}
                          alt={producto.nombre}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400 dark:text-gray-500">
                          👕
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold uppercase text-sky-700 bg-sky-50 border border-sky-200 dark:text-cyan-400 dark:bg-cyan-950/40 dark:border-cyan-500/30 px-2 py-0.5 rounded">
                          {producto.sku}
                        </span>
                        {producto.categoria && (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 dark:text-gray-400 dark:bg-white/5 dark:border-white/10 px-2 py-0.5 rounded">
                            {producto.categoria}
                          </span>
                        )}
                        {producto.modelo && (
                          <span className="text-[11px] text-slate-500 dark:text-gray-400">
                            Mod: {producto.modelo}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {producto.nombre}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        Precio Ref:{" "}
                        <span className="text-slate-900 dark:text-white font-semibold">
                          {formatMoney(producto.precioVenta)}
                        </span>
                        {isAdmin && producto.precioCosto > 0 && (
                          <span className="ml-2 text-emerald-700 dark:text-emerald-400/90 font-mono text-[11px] font-semibold">
                            (CPP Base: {formatMoney(producto.precioCosto)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-white/5">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-500 dark:text-gray-400 block font-medium">
                        Stock del Producto
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                          {producto.stockTotalFiltrado} u.
                        </span>
                        <span className="text-xs text-sky-800 bg-sky-100 border border-sky-200 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/20 font-bold px-2 py-0.5 rounded-full">
                          {totalVariantes} {totalVariantes === 1 ? "variante" : "variantes"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-200 text-xs font-semibold transition active:scale-95 cursor-pointer"
                    >
                      <span>{isExpanded ? "Ocultar" : "Ver Variantes"}</span>
                      <span className="text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                  </div>
                </div>

                {/* SUB-NIVEL DETALLE: VARIANTES DEL PRODUCTO */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-black/30 p-3.5 sm:p-5 animate-in fade-in duration-150">
                    {/* VISTA MÓVIL: TARJETAS DE VARIANTES (sm:hidden) */}
                    <div className="space-y-3 sm:hidden">
                      {producto.variantesFiltradas.map((variante, idx) => {
                        const varImg = getVarianteImagenPrincipal(variante) || imagenPrincipal;
                        const stockData = getStockVarianteSegunSucursal(variante, sucursalSeleccionadaId);
                        const stockFis = stockData.fisico;
                        const stockRes = stockData.reservado;
                        const stockDisp = stockData.disponible;
                        const estado = calcularEstadoStock(stockDisp, producto.stockMinimo || 2);

                        return (
                          <div
                            key={variante.varianteId || idx}
                            className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/50 p-3 space-y-2.5 text-xs shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-11 w-11 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 shrink-0">
                                  {varImg ? (
                                    <CloudinaryImage
                                      src={varImg}
                                      alt={variante.color}
                                      width={50}
                                      height={50}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400 dark:text-gray-500">
                                      👟
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                                      {variante.color}
                                      {variante.colorSecundario && ` / ${variante.colorSecundario}`}
                                    </span>
                                    <span className="rounded bg-sky-100 text-sky-800 border border-sky-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/30 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                                      T.{variante.talla}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                                    {variante.codigoBarra ? `Cód: ${variante.codigoBarra}` : "Sin código"}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                  estado === "AGOTADO"
                                    ? "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                                    : estado === "BAJO"
                                    ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                    : "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                                }`}
                              >
                                {estado === "AGOTADO" ? "Sin Stock" : estado === "BAJO" ? "Bajo" : "Normal"}
                              </span>
                            </div>

                            {/* Stock pills en móvil */}
                            <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-slate-100 dark:border-white/5">
                              <div className="rounded-lg bg-slate-50 dark:bg-black/30 p-1.5 border border-slate-100 dark:border-transparent">
                                <span className="text-[9px] text-slate-500 dark:text-gray-400 block uppercase font-medium">Físico</span>
                                <span className="font-bold text-slate-800 dark:text-gray-200">{stockFis} u.</span>
                              </div>
                              <div className="rounded-lg bg-slate-50 dark:bg-black/30 p-1.5 border border-slate-100 dark:border-transparent">
                                <span className="text-[9px] text-slate-500 dark:text-gray-400 block uppercase font-medium">Res.</span>
                                <span className="font-bold text-amber-600 dark:text-amber-300">{stockRes > 0 ? `${stockRes} u.` : "0"}</span>
                              </div>
                              <div className="rounded-lg bg-sky-50 dark:bg-cyan-950/40 p-1.5 border border-sky-200 dark:border-cyan-500/20">
                                <span className="text-[9px] text-sky-700 dark:text-cyan-300 block uppercase font-bold">Disp.</span>
                                <span className="font-extrabold text-sky-700 dark:text-cyan-300">{stockDisp} u.</span>
                              </div>
                            </div>

                            {/* Sucursales breakdown */}
                            {variante.sucursalesStock && variante.sucursalesStock.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {variante.sucursalesStock.map((s) => (
                                  <span
                                    key={s.sucursalId}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${
                                      s.sucursalId === sucursalSeleccionadaId
                                        ? "bg-sky-100 text-sky-800 border border-sky-300 dark:bg-cyan-500/25 dark:text-cyan-200 dark:border-cyan-400/50"
                                        : s.stockDisponible > 0
                                        ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                                        : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-gray-500"
                                    }`}
                                  >
                                    {s.codigo}: {s.stockDisponible}
                                  </span>
                                ))}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerVariante({ producto, variante });
                              }}
                              className="w-full flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 dark:text-cyan-300 text-xs font-bold transition active:scale-98 cursor-pointer"
                            >
                              <span>🔍</span> Ver Análisis & Costo
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* VISTA ESCRITORIO: TABLA (hidden sm:block) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs text-slate-700 dark:text-gray-300">
                        <thead className="text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider text-[10px] font-semibold">
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
                        <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                          {producto.variantesFiltradas.map((variante, idx) => {
                            const varImg = getVarianteImagenPrincipal(variante) || imagenPrincipal;
                            const stockData = getStockVarianteSegunSucursal(variante, sucursalSeleccionadaId);
                            const stockFis = stockData.fisico;
                            const stockRes = stockData.reservado;
                            const stockDisp = stockData.disponible;
                            const estado = calcularEstadoStock(stockDisp, producto.stockMinimo || 2);

                            return (
                              <tr
                                key={variante.varianteId || idx}
                                className="hover:bg-white dark:hover:bg-white/[0.04] transition"
                              >
                                <td className="px-3 py-2.5">
                                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 flex-shrink-0">
                                    {varImg ? (
                                      <CloudinaryImage
                                        src={varImg}
                                        alt={variante.color}
                                        width={50}
                                        height={50}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400 dark:text-gray-500">
                                        👟
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white capitalize">
                                  {variante.color}
                                  {variante.colorSecundario && (
                                    <span className="text-[10px] text-slate-500 dark:text-gray-400 block">
                                      / {variante.colorSecundario}
                                    </span>
                                  )}
                                </td>

                                <td className="px-3 py-2.5 text-center font-mono font-bold text-sky-700 dark:text-cyan-300">
                                  {variante.talla}
                                </td>

                                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 dark:text-gray-400">
                                  {variante.codigoBarra || "Sin código"}
                                </td>

                                <td className="px-3 py-2.5 text-center font-semibold text-slate-900 dark:text-gray-200">
                                  {stockFis} u.
                                </td>

                                <td className="px-3 py-2.5 text-center text-amber-600 dark:text-amber-300 font-mono font-semibold">
                                  {stockRes > 0 ? `${stockRes} u.` : "-"}
                                </td>

                                <td className="px-3 py-2.5 text-center">
                                  <span className="font-extrabold text-sky-700 dark:text-cyan-300 font-mono text-sm block">
                                    {stockDisp} u.
                                  </span>
                                  {variante.sucursalesStock && variante.sucursalesStock.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 justify-center max-w-[200px] mx-auto">
                                      {variante.sucursalesStock.map((s) => (
                                        <span
                                          key={s.sucursalId}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition ${
                                            s.sucursalId === sucursalSeleccionadaId
                                              ? "bg-sky-100 text-sky-800 border border-sky-300 dark:bg-cyan-500/25 dark:text-cyan-200 dark:border-cyan-400/50 shadow-sm"
                                              : s.stockDisponible > 0
                                              ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                                              : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-gray-500"
                                          }`}
                                          title={`${s.nombre}: ${s.stockDisponible} disp. (${s.stockFisico} fís / ${s.stockReservado} res)`}
                                        >
                                          {s.codigo}: {s.stockDisponible}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                      estado === "AGOTADO"
                                        ? "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                                        : estado === "BAJO"
                                        ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                        : "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
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
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAjusteTarget({ producto, variante });
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                                        title="Ajustar stock físico (sobrante o faltante)"
                                      >
                                        <span>⚖️</span> Ajustar
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDrawerVariante({ producto, variante });
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30 text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>🔍</span> Ver Análisis
                                    </button>
                                  </div>
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
          onStockUpdated={onStockUpdated}
        />
      )}

      {/* 5. MODAL DE AJUSTE RÁPIDO DE STOCK */}
      {ajusteTarget && (
        <AjusteStockModal
          isOpen={Boolean(ajusteTarget)}
          producto={ajusteTarget.producto}
          variante={ajusteTarget.variante}
          onClose={() => setAjusteTarget(null)}
          onSuccess={() => {
            setAjusteTarget(null);
            if (onStockUpdated) onStockUpdated();
          }}
        />
      )}
    </div>
  );
}
