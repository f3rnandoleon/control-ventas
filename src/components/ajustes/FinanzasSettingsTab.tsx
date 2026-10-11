"use client";

import { useState } from "react";
import { FinanzasAjustes } from "@/types/ajustes";

interface FinanzasSettingsTabProps {
  finanzas: FinanzasAjustes;
  onChange: (updated: FinanzasAjustes) => void;
}

export default function FinanzasSettingsTab({
  finanzas,
  onChange,
}: FinanzasSettingsTabProps) {
  const [testAmountPEN, setTestAmountPEN] = useState<number>(35);

  const tc = finanzas.tipoCambioPEN_BOB || 2.1;
  const calculatedBOB = (testAmountPEN * tc).toFixed(2);

  const handleTcChange = (val: number) => {
    onChange({
      ...finanzas,
      tipoCambioPEN_BOB: val,
    });
  };

  return (
    <div className="space-y-6">
      {/* Tarjeta Principal de Tipo de Cambio */}
      <div className="surface-card rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Tasa Oficial del Sistema
            </span>
            <h2 className="text-xl font-bold text-slate-800 mt-2">
              Tipo de Cambio Oficial (PEN ➔ BOB)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Este valor se utilizará por defecto para convertir el costo de compra en Soles peruanos
              a Bolivianos al registrar nuevos productos en el catálogo.
            </p>
          </div>

          <div className="rounded-xl bg-sky-50 p-4 border border-sky-100 text-center min-w-[180px]">
            <p className="text-xs font-medium text-sky-600 uppercase tracking-wider">
              Equivalencia Actual
            </p>
            <p className="text-2xl font-black text-sky-900 mt-0.5">
              1 PEN = {tc.toFixed(2)} BOB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tipo de Cambio (Bolivianos por cada Sol)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={finanzas.tipoCambioPEN_BOB ?? ""}
                onChange={(e) => handleTcChange(parseFloat(e.target.value) || 0)}
                className="input w-full text-lg font-bold text-slate-800 pr-16"
                placeholder="2.10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Bs / S/.
              </span>
            </div>
            {finanzas.ultimaActualizacionTipoCambio && (
              <p className="text-xs text-slate-400 mt-2">
                Última actualización:{" "}
                {new Date(finanzas.ultimaActualizacionTipoCambio).toLocaleString("es-BO")}
              </p>
            )}
          </div>

          {/* Calculadora en Vivo para Validación Visual */}
          <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/50 p-5">
            <h3 className="text-sm font-bold text-sky-900 mb-3 flex items-center gap-2">
              <span>🧮</span> Simulador de Conversión Rápida
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 font-medium">Costo en Soles (S/.)</label>
                <input
                  type="number"
                  step="1"
                  value={testAmountPEN}
                  onChange={(e) => setTestAmountPEN(parseFloat(e.target.value) || 0)}
                  className="input w-full mt-1 text-sm bg-white"
                />
              </div>
              <div className="text-slate-400 font-bold pt-4">➔</div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 font-medium">Costo en Bolivianos (Bs)</label>
                <div className="mt-1 flex h-10 items-center rounded-xl bg-white px-3 font-black text-sky-700 border border-slate-200">
                  Bs {calculatedBOB}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              * El costo calculado en Bolivianos se congelará como snapshot al registrar cada prenda.
            </p>
          </div>
        </div>
      </div>

      {/* Nota Explicativa Contable */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <h4 className="font-bold">Regla de Inmutabilidad Contable</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Modificar el tipo de cambio aquí <strong>no alterará</strong> el costo en Bolivianos ni las ganancias de los productos registrados anteriormente. Cada producto conserva la tasa exacta con la que fue ingresado al sistema para proteger la exactitud de tus reportes históricos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
