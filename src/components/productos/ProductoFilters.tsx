import type { EstadoStock } from "@/utils/stock";

export type ProductoFilterValues = {
  categoria: string;
  precioMin: string;
  precioMax: string;
  estadoStock: "" | EstadoStock;
};

export const EMPTY_PRODUCT_FILTERS: ProductoFilterValues = {
  categoria: "", precioMin: "", precioMax: "", estadoStock: "",
};

export default function ProductoFilters({ value, categorias, onChange }: {
  value: ProductoFilterValues;
  categorias: string[];
  onChange: (filters: ProductoFilterValues) => void;
}) {
  const update = (field: keyof ProductoFilterValues, fieldValue: string) =>
    onChange({ ...value, [field]: fieldValue });
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2 xl:grid-cols-5">
      <select className="input" value={value.categoria} onChange={(e) => update("categoria", e.target.value)}>
        <option value="">Todas las categorías</option>
        {categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
      </select>
      <input className="input" type="number" min="0" placeholder="Precio mínimo" value={value.precioMin} onChange={(e) => update("precioMin", e.target.value)} />
      <input className="input" type="number" min="0" placeholder="Precio máximo" value={value.precioMax} onChange={(e) => update("precioMax", e.target.value)} />
      <select className="input" value={value.estadoStock} onChange={(e) => update("estadoStock", e.target.value)}>
        <option value="">Todo el stock</option><option value="EN_STOCK">En stock</option>
        <option value="BAJO_STOCK">Bajo stock</option><option value="SIN_STOCK">Sin stock</option>
      </select>
      <button type="button" className="btn-secondary" onClick={() => onChange(EMPTY_PRODUCT_FILTERS)}>Limpiar filtros</button>
    </div>
  );
}
