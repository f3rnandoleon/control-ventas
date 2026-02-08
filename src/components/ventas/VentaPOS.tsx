"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVentaSchema, CreateVentaInput } from "@/schemas/venta.schema";
import { useState } from "react";
import { createVenta } from "@/services/venta.service";
import { Producto } from "@/types/producto";
import Toast from "../ui/Toast";

// Tipo extendido para incluir stock disponible en el formulario (no se envía al backend)
type VentaFormValues = CreateVentaInput & {
  items: (CreateVentaInput["items"][number] & { stockDisponible?: number })[];
};

export default function VentaPOS({
  productos,
  onSuccess,
}: {
  productos: Producto[];
  onSuccess: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<VentaFormValues>({
    resolver: zodResolver(createVentaSchema),
    defaultValues: {
      items: [],
      metodoPago: "EFECTIVO",
      tipoVenta: "TIENDA",
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const agregarItem = () => {
    append({
      productoId: "",
      color: "",
      talla: "",
      cantidad: 1,
      stockDisponible: 0,
    });
  };

  const onSubmit = async (data: VentaFormValues) => {
    try {
      if (data.items.length === 0) {
        setToast({ message: "Agrega al menos un producto", type: "error" });
        return;
      }

      await createVenta({
        items: data.items.map(({ productoId, color, talla, cantidad }) => ({
          productoId,
          color,
          talla,
          cantidad,
        })),
        metodoPago: data.metodoPago,
        tipoVenta: "TIENDA",
      });

      reset({ items: [], metodoPago: "EFECTIVO", tipoVenta: "TIENDA" });
      setToast({
        message: "Venta registrada correctamente",
        type: "success",
      });

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar venta";
      setToast({ message, type: "error" });
    }
  };

  // Observar items para calcular totales
  const watchedItems = watch("items");

  const subtotal = watchedItems?.reduce((sum, item) => {
    if (!item.productoId || !item.cantidad) return sum;
    const producto = productos.find((p) => p._id === item.productoId);
    if (!producto) return sum;
    return sum + producto.precioVenta * item.cantidad;
  }, 0) || 0;

  const total = subtotal;

  return (
    <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-sm">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
          <span>🛍️</span> Nueva venta
        </h2>
        <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
          {fields.length} {fields.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Header de la tabla */}
      {fields.length > 0 && (
        <div className="grid grid-cols-[3fr_2fr_1fr_1fr_1fr_auto] gap-4 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div>Producto</div>
          <div>Variante</div>
          <div className="text-center">Cant</div>
          <div className="text-right">Precio</div>
          <div className="text-right">Subtotal</div>
          <div></div>
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const currentItem = watchedItems?.[index] || {};
          const productoSeleccionado = productos.find(p => p._id === currentItem.productoId);
          const precio = productoSeleccionado?.precioVenta || 0;
          const subtotalItem = precio * (currentItem.cantidad || 0);

          return (
            <div
              key={field.id}
              className="grid grid-cols-[3fr_2fr_1fr_1fr_1fr_auto] gap-4 items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors group"
            >
              {/* 1. Producto */}
              <select
                {...register(`items.${index}.productoId` as const)}
                className="input-chroma w-full text-sm bg-gray-800/50 rounded-md border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 py-1.5"
                onChange={(e) => {
                  const pid = e.target.value;
                  setValue(`items.${index}.productoId`, pid);
                  setValue(`items.${index}.color`, "");
                  setValue(`items.${index}.talla`, "");
                  setValue(`items.${index}.stockDisponible`, 0);
                  setValue(`items.${index}.cantidad`, 1);
                }}
              >
                <option value="">Seleccionar producto...</option>
                {productos.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nombre}
                  </option>
                ))}
              </select>

              {/* 2. Variante */}
              <div className="relative">
                <select
                  className="input-chroma w-full text-sm bg-gray-800/50 rounded-md border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 py-1.5 disabled:opacity-50"
                  disabled={!currentItem.productoId}
                  value={
                    currentItem.color && currentItem.talla
                      ? `${currentItem.color}-${currentItem.talla}`
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const [color, talla] = val.split("-");
                    const variante = productoSeleccionado?.variantes.find(
                      (v) => v.color === color && v.talla === talla
                    );

                    if (variante) {
                      setValue(`items.${index}.color`, variante.color);
                      setValue(`items.${index}.talla`, variante.talla);
                      setValue(`items.${index}.stockDisponible`, variante.stock);
                      // Reset cantidad si excede stock
                      if (currentItem.cantidad > variante.stock) {
                        setValue(`items.${index}.cantidad`, variante.stock);
                      }
                    }
                  }}
                >
                  <option value="">Variante...</option>
                  {productoSeleccionado?.variantes.map((v) => (
                    <option
                      key={`${v.color}-${v.talla}`}
                      value={`${v.color}-${v.talla}`}
                      disabled={v.stock <= 0}
                    >
                      {v.color} - {v.talla} ({v.stock})
                    </option>
                  ))}
                </select>
                {/* Campos ocultos */}
                <input type="hidden" {...register(`items.${index}.color`)} />
                <input type="hidden" {...register(`items.${index}.talla`)} />
              </div>

              {/* 3. Cantidad con Clamping */}
              <div className="relative">
                <input
                  type="number"
                  {...register(`items.${index}.cantidad`, {
                    valueAsNumber: true,
                    min: 1
                  })}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    const max = currentItem.stockDisponible || 0;

                    if (isNaN(val) || val < 1) val = 1;

                    // 🔒 VALIDACIÓN ESTRICTA: No permitir superar el stock
                    if (val > max && max > 0) {
                      val = max;
                      // Aquí podríamos mostrar un toast aviso si quisiéramos
                    }

                    // Forzamos el valor en el input y en el formulario
                    e.target.value = val.toString();
                    setValue(`items.${index}.cantidad`, val);
                  }}
                  className="input-chroma w-full text-center font-mono font-medium bg-gray-800/50 rounded-md border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 py-1.5"
                  min={1}
                  disabled={!currentItem.stockDisponible}
                />
                {currentItem.stockDisponible !== undefined && currentItem.stockDisponible > 0 && (
                  <div className="absolute -top-3 right-0 bg-cyan-900/80 text-cyan-200 text-[10px] px-1.5 py-0.5 rounded border border-cyan-800 shadow-sm pointer-events-none">
                    Max: {currentItem.stockDisponible}
                  </div>
                )}
              </div>

              {/* 4. Precio */}
              <div className="text-right text-gray-400 text-sm font-mono">
                {precio > 0 ? `Bs ${precio}` : '-'}
              </div>

              {/* 5. Subtotal */}
              <div className="text-right text-cyan-400 font-bold text-sm font-mono">
                {subtotalItem > 0 ? `Bs ${subtotalItem.toFixed(2)}` : '-'}
              </div>

              {/* 6. Eliminar */}
              <button
                type="button"
                className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-full transition-all flex items-center justify-center"
                onClick={() => remove(index)}
                title="Quitar item"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}

        {fields.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl text-gray-500 bg-white/5">
            <p className="mb-2">No hay productos en la venta</p>
            <button
              type="button"
              onClick={agregarItem}
              className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline focus:outline-none"
            >
              Comenzar agregando uno
            </button>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/10">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors px-2 py-1 rounded hover:bg-cyan-900/10"
          onClick={agregarItem}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar otro producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end bg-black/20 p-5 rounded-xl border border-white/5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Método de Pago</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`cursor-pointer border rounded-lg p-3 text-center transition-all flex items-center justify-center gap-2 ${watch("metodoPago") === "EFECTIVO"
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "bg-white/5 border-white/10 hover:border-white/20 text-gray-400"
                }`}>
                <input type="radio" {...register("metodoPago")} value="EFECTIVO" className="hidden" />
                <span>💵</span> <span className="font-medium">Efectivo</span>
              </label>
              <label className={`cursor-pointer border rounded-lg p-3 text-center transition-all flex items-center justify-center gap-2 ${watch("metodoPago") === "QR"
                  ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                  : "bg-white/5 border-white/10 hover:border-white/20 text-gray-400"
                }`}>
                <input type="radio" {...register("metodoPago")} value="QR" className="hidden" />
                <span>📱</span> <span className="font-medium">QR</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end pb-3 border-b border-white/10">
            <span className="text-gray-400 font-medium">Total a Pagar</span>
            <span className="text-3xl font-bold text-white tracking-tight">
              <span className="text-2xl text-cyan-500 mr-1">Bs</span>
              {total.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            className="btn-primary w-full h-12 text-lg shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transform hover:-translate-y-0.5 transition-all"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || fields.length === 0}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ✅ Confirmar Venta
              </span>
            )}
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
