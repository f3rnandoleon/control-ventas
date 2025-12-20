"use client";

export default function ReportesFiltros({
  from,
  to,
  metodo,
  onChange,
}: {
  from: string;
  to: string;
  metodo: string;
  onChange: (data: {
    from?: string;
    to?: string;
    metodo?: string;
  }) => void;
}) {
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-xl p-4
      flex flex-col md:flex-row gap-4 items-end"
    >
      <div>
        <label className="text-xs text-gray-400">Desde</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onChange({ from: e.target.value })}
          className="input"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400">Hasta</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange({ to: e.target.value })}
          className="input"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400">Método de pago</label>
        <select
          value={metodo}
          onChange={(e) => onChange({ metodo: e.target.value })}
          className="input"
        >
          <option value="">Todos</option>
          <option value="EFECTIVO">Efectivo</option>
          <option value="QR">QR</option>
        </select>
      </div>
    </div>
  );
}
