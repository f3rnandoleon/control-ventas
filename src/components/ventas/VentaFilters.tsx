export type VentaFilterValues = {
  from: string; to: string; customer: string; seller: string; paymentMethod: "" | "EFECTIVO" | "QR";
};

export const EMPTY_VENTA_FILTERS: VentaFilterValues = { from: "", to: "", customer: "", seller: "", paymentMethod: "" };

export default function VentaFilters({ value, onChange }: { value: VentaFilterValues; onChange: (value: VentaFilterValues) => void }) {
  const update = (field: keyof VentaFilterValues, fieldValue: string) => onChange({ ...value, [field]: fieldValue });
  return <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2 xl:grid-cols-6">
    <label className="label">Desde<input className="input mt-1" type="date" value={value.from} onChange={(e) => update("from", e.target.value)} /></label>
    <label className="label">Hasta<input className="input mt-1" type="date" min={value.from || undefined} value={value.to} onChange={(e) => update("to", e.target.value)} /></label>
    <label className="label">Cliente<input className="input mt-1" placeholder="Nombre del cliente" value={value.customer} onChange={(e) => update("customer", e.target.value)} /></label>
    <label className="label">Vendedor<input className="input mt-1" placeholder="Nombre del vendedor" value={value.seller} onChange={(e) => update("seller", e.target.value)} /></label>
    <label className="label">Método<select className="input mt-1" value={value.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)}>
      <option value="">Todos</option><option value="EFECTIVO">Efectivo</option><option value="QR">QR</option>
    </select></label>
    <button className="btn-secondary self-end" type="button" onClick={() => onChange(EMPTY_VENTA_FILTERS)}>Limpiar filtros</button>
  </div>;
}
