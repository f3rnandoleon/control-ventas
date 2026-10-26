"use client";

export type VentaFilterValues = {
  from: string;
  to: string;
  customer: string;
  seller: string;
  paymentMethod: "" | "EFECTIVO" | "QR";
};

export const EMPTY_VENTA_FILTERS: VentaFilterValues = {
  from: "",
  to: "",
  customer: "",
  seller: "",
  paymentMethod: "",
};

export default function VentaFilters({
  value,
  onChange,
}: {
  value: VentaFilterValues;
  onChange: (value: VentaFilterValues) => void;
}) {
  const update = (field: keyof VentaFilterValues, fieldValue: string) =>
    onChange({ ...value, [field]: fieldValue });

  // Accesos rápidos de fechas
  const setDatePreset = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "clear") => {
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split("T")[0];

    if (preset === "clear") {
      onChange({ ...value, from: "", to: "" });
      return;
    }

    if (preset === "today") {
      onChange({ ...value, from: todayStr, to: todayStr });
      return;
    }

    if (preset === "yesterday") {
      const yest = new Date(todayObj);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split("T")[0];
      onChange({ ...value, from: yestStr, to: yestStr });
      return;
    }

    if (preset === "last7") {
      const past7 = new Date(todayObj);
      past7.setDate(past7.getDate() - 6);
      const past7Str = past7.toISOString().split("T")[0];
      onChange({ ...value, from: past7Str, to: todayStr });
      return;
    }

    if (preset === "thisMonth") {
      const startMonth = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);
      const startMonthStr = startMonth.toISOString().split("T")[0];
      onChange({ ...value, from: startMonthStr, to: todayStr });
      return;
    }
  };

  const hasActiveFilters = Boolean(
    value.from || value.to || value.customer || value.seller || value.paymentMethod
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 shadow-sm space-y-3.5">
      {/* Botones rápidos de período */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 font-semibold text-[11px] shrink-0 mr-1">
          Periodo rápido:
        </span>
        <button
          type="button"
          onClick={() => setDatePreset("today")}
          className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 font-medium transition active:scale-95"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => setDatePreset("yesterday")}
          className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 font-medium transition active:scale-95"
        >
          Ayer
        </button>
        <button
          type="button"
          onClick={() => setDatePreset("last7")}
          className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 font-medium transition active:scale-95"
        >
          Últimos 7 días
        </button>
        <button
          type="button"
          onClick={() => setDatePreset("thisMonth")}
          className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 font-medium transition active:scale-95"
        >
          Este mes
        </button>
      </div>

      {/* Grid de Filtros */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 items-end">
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mb-1">
            Desde
          </label>
          <input
            className="input w-full text-xs"
            type="date"
            value={value.from}
            onChange={(e) => update("from", e.target.value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mb-1">
            Hasta
          </label>
          <input
            className="input w-full text-xs"
            type="date"
            min={value.from || undefined}
            value={value.to}
            onChange={(e) => update("to", e.target.value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mb-1">
            Cliente
          </label>
          <input
            className="input w-full text-xs"
            placeholder="Buscar por cliente..."
            value={value.customer}
            onChange={(e) => update("customer", e.target.value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mb-1">
            Vendedor
          </label>
          <input
            className="input w-full text-xs"
            placeholder="Buscar por vendedor..."
            value={value.seller}
            onChange={(e) => update("seller", e.target.value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mb-1">
            Método de Pago
          </label>
          <select
            className="input w-full text-xs"
            value={value.paymentMethod}
            onChange={(e) =>
              update("paymentMethod", e.target.value as VentaFilterValues["paymentMethod"])
            }
          >
            <option value="">Todos los métodos</option>
            <option value="EFECTIVO">💵 Efectivo</option>
            <option value="QR">📱 QR</option>
          </select>
        </div>

        <div>
          <button
            type="button"
            disabled={!hasActiveFilters}
            className="w-full flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 text-xs font-bold transition active:scale-95 disabled:opacity-40 cursor-pointer shadow-sm"
            onClick={() => onChange(EMPTY_VENTA_FILTERS)}
          >
            <span>🔄</span>
            <span>Limpiar filtros</span>
          </button>
        </div>
      </div>
    </div>
  );
}
