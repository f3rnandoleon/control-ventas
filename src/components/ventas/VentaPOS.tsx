"use client";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createPedidoSchema } from "@/schemas/pedido.schema";
import { createVenta } from "@/services/pedidos.service";
import { Producto } from "@/types/producto";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import CloudinaryImage from "@/components/ui/CloudinaryImage";

// Tipo extendido para incluir stock disponible en el formulario (no se envía al backend)
type VentaFormValues = z.input<typeof createPedidoSchema>;
type VentaFormSubmitValues = z.output<typeof createPedidoSchema>;

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
    formState: { isSubmitting },
  } = useForm<VentaFormValues, unknown, VentaFormSubmitValues>({
    resolver: zodResolver(createPedidoSchema),
    defaultValues: {
      items: [],
      metodoPago: "EFECTIVO",
      canal: "TIENDA",
      descuento: 0,
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Estado local para el tipo de descuento (Bs o %)
  const [tipoDescuento, setTipoDescuento] = useState<"BS" | "PORCENTAJE">("BS");
  const [valorDescuento, setValorDescuento] = useState<number>(0);

  const agregarItem = () => {
    append({
      productoId: "",
      varianteId: undefined,
      color: "",
      talla: "",
      cantidad: 1,
    });
  };

  // Observar items para calcular totales
  const watchedItems = watch("items") ?? [];

  const subtotal = watchedItems?.reduce((sum, item) => {
    if (!item.productoId || !item.cantidad) return sum;
    const producto = productos.find((p) => p._id === item.productoId);
    if (!producto) return sum;
    return sum + producto.precioVenta * item.cantidad;
  }, 0) || 0;

  // Calcular el monto de descuento en Bs
  const montoDescuento =
    tipoDescuento === "PORCENTAJE"
      ? Math.min((valorDescuento / 100) * subtotal, subtotal)
      : Math.min(valorDescuento, subtotal);

  const total = Math.max(subtotal - montoDescuento, 0);

  const handleDescuentoChange = (val: number) => {
    const cleaned = Math.max(0, val);
    if (tipoDescuento === "PORCENTAJE" && cleaned > 100) {
      setValorDescuento(100);
    } else {
      setValorDescuento(cleaned);
    }
  };

  const onSubmit = async (data: VentaFormSubmitValues) => {
    try {
      if (data.items.length === 0) {
        toast.error("Agrega al menos un producto");
        return;
      }

      await createVenta({
        items: data.items.map(({ productoId, varianteId, color, talla, cantidad }) => ({
          productoId,
          varianteId,
          color,
          talla,
          cantidad,
        })),
        metodoPago: data.metodoPago,
        canal: "TIENDA",
        descuento: montoDescuento,
      });

      reset({ items: [], metodoPago: "EFECTIVO", canal: "TIENDA", descuento: 0 });
      setValorDescuento(0);

      toast.success("Venta registrada correctamente");
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar venta";
      toast.error(message)
    }
  };

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
        <div className="grid grid-cols-[auto_3fr_2fr_1fr_1fr_1fr_auto] gap-4 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div>Imagen</div>
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
          const currentItem = watchedItems[index] ?? {
            productoId: "",
            varianteId: undefined,
            color: "",
            talla: "",
            cantidad: 1,
          };
          const productoSeleccionado = productos.find(p => p._id === currentItem.productoId);
          const varianteSeleccionada = productoSeleccionado?.variantes.find(
            (v) =>
              (currentItem.varianteId && v.varianteId === currentItem.varianteId) ||
              (v.color === currentItem.color && v.talla === currentItem.talla)
          );
          const imagenVariante = getVarianteImagenPrincipal(varianteSeleccionada);
          const stockDisponible = varianteSeleccionada?.stock ?? 0;
          const varianteLabel = varianteSeleccionada
            ? `${varianteSeleccionada.color} - ${varianteSeleccionada.talla}`
            : "Variante sin seleccionar";
          const selectedVariantValue =
            typeof currentItem.varianteId === "string" && currentItem.varianteId
              ? currentItem.varianteId
              : currentItem.color && currentItem.talla
                ? `${currentItem.color}|${currentItem.talla}`
                : "";
          const precio = productoSeleccionado?.precioVenta || 0;
          const subtotalItem = precio * (currentItem.cantidad || 0);

          return (
            <div
              key={field.id}
              className="grid grid-cols-[auto_3fr_2fr_1fr_1fr_1fr_auto] gap-4 items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors group"
            >
              {/* 0. Imagen de Variante */}
              <div className="flex items-center justify-center">
                {imagenVariante ? (
                  <CloudinaryImage
                    src={imagenVariante}
                    alt={varianteLabel}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded-lg border border-white/20 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-800/50 border border-white/10 rounded-lg flex items-center justify-center text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* 1. Producto */}
              <select
                {...register(`items.${index}.productoId` as const)}
                className="input-chroma w-full text-sm bg-gray-800/50 rounded-md border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 py-1.5"
                onChange={(e) => {
                  const pid = e.target.value;
                  setValue(`items.${index}.productoId`, pid);
                  setValue(`items.${index}.varianteId`, undefined);
                  setValue(`items.${index}.color`, "");
                  setValue(`items.${index}.talla`, "");
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
                  value={selectedVariantValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const variante = productoSeleccionado?.variantes.find(
                      (v) =>
                        v.varianteId === val ||
                        `${v.color}|${v.talla}` === val
                    );

                    if (variante) {
                      setValue(`items.${index}.varianteId`, variante.varianteId);
                      setValue(`items.${index}.color`, variante.color);
                      setValue(`items.${index}.talla`, variante.talla);
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
                      key={v.varianteId || `${v.color}-${v.talla}`}
                      value={v.varianteId || `${v.color}|${v.talla}`}
                      disabled={v.stock <= 0}
                    >
                      {v.color} - {v.talla} ({v.stock})
                    </option>
                  ))}
                </select>
                {/* Campos ocultos */}
                <input type="hidden" {...register(`items.${index}.varianteId`)} />
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
                    const max = stockDisponible;

                    if (isNaN(val) || val < 1) val = 1;

                    // 🔒 VALIDACIÓN ESTRICTA: No permitir superar el stock
                    if (val > max && max > 0) {
                      val = max;
                    }

                    // Forzamos el valor en el input y en el formulario
                    e.target.value = val.toString();
                    setValue(`items.${index}.cantidad`, val);
                  }}
                  className="input-chroma w-full text-center font-mono font-medium bg-gray-800/50 rounded-md border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 py-1.5"
                  min={1}
                  disabled={!stockDisponible}
                />
                {stockDisponible > 0 && (
                  <div className="absolute -top-3 right-0 bg-cyan-900/80 text-cyan-200 text-[10px] px-1.5 py-0.5 rounded border border-cyan-800 shadow-sm pointer-events-none">
                    Max: {stockDisponible}
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
          {/* Método de Pago */}
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

          {/* Descuento */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider flex items-center gap-2">
              <span>🏷️</span> Descuento
            </label>
            <div className="flex gap-2 items-stretch">
              {/* Toggle Bs / % */}
              <div className="flex rounded-lg overflow-hidden border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTipoDescuento("BS");
                    setValorDescuento(0);
                  }}
                  className={`px-3 py-2 text-sm font-semibold transition-all ${
                    tipoDescuento === "BS"
                      ? "bg-amber-500/20 text-amber-300 border-r border-amber-500/40"
                      : "bg-white/5 text-gray-500 hover:text-gray-300 border-r border-white/10"
                  }`}
                >
                  Bs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoDescuento("PORCENTAJE");
                    setValorDescuento(0);
                  }}
                  className={`px-3 py-2 text-sm font-semibold transition-all ${
                    tipoDescuento === "PORCENTAJE"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/5 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  %
                </button>
              </div>

              {/* Input de descuento */}
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  max={tipoDescuento === "PORCENTAJE" ? 100 : subtotal}
                  step="0.01"
                  value={valorDescuento || ""}
                  onChange={(e) => handleDescuentoChange(parseFloat(e.target.value) || 0)}
                  placeholder={tipoDescuento === "BS" ? "0.00" : "0"}
                  className="input-chroma w-full bg-gray-800/50 rounded-lg border-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-2 px-3 text-white placeholder-gray-600 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  {tipoDescuento === "PORCENTAJE" ? "%" : "Bs"}
                </span>
              </div>
            </div>

            {/* Vista previa del descuento */}
            {montoDescuento > 0 && (
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <span className="text-xs text-amber-300/70">Ahorro</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  −Bs {montoDescuento.toFixed(2)}
                  {tipoDescuento === "PORCENTAJE" && valorDescuento > 0 && (
                    <span className="text-amber-500/70 text-xs ml-1">({valorDescuento}%)</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Resumen y botón */}
        <div className="space-y-4">
          <div className="space-y-2 pb-3 border-b border-white/10">
            {/* Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-sm text-gray-400 font-mono">Bs {subtotal.toFixed(2)}</span>
            </div>

            {/* Descuento */}
            {montoDescuento > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-400/80 flex items-center gap-1">
                  <span>🏷️</span> Descuento
                </span>
                <span className="text-sm text-amber-400 font-mono font-semibold">
                  −Bs {montoDescuento.toFixed(2)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-end pt-1">
              <span className="text-gray-400 font-medium">Total a Pagar</span>
              <span className="text-3xl font-bold text-white tracking-tight">
                <span className="text-2xl text-cyan-500 mr-1">Bs</span>
                {total.toFixed(2)}
              </span>
            </div>
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


    </div>
  );
}
