"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CloudinaryImage from "@/components/ui/CloudinaryImage";
import { createPedidoSchema } from "@/schemas/pedido.schema";
import { createVenta } from "@/services/pedidos.service";
import type { Producto } from "@/types/producto";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";

type VentaFormValues = z.input<typeof createPedidoSchema>;
type VentaFormSubmitValues = z.output<typeof createPedidoSchema>;
type VentaFormItem = VentaFormValues["items"][number];
type VentaVariant = Producto["variantes"][number];

const getStockDisponible = (variant: VentaVariant) => variant.stockDisponible ?? variant.stock ?? 0;

const getVariantKey = (variant: Pick<VentaVariant, "varianteId" | "color" | "colorSecundario" | "talla">) =>
  variant.varianteId || [variant.color, variant.colorSecundario || "", variant.talla].join("|");

const getItemKey = (item: Partial<Pick<VentaFormItem, "varianteId" | "color" | "colorSecundario" | "talla">>) =>
  item.varianteId || [item.color || "", item.colorSecundario || "", item.talla || ""].join("|");

const matchesVariant = (
  variant: VentaVariant,
  item: Partial<Pick<VentaFormItem, "varianteId" | "color" | "colorSecundario" | "talla">>
) => {
  if (item.varianteId && variant.varianteId) return variant.varianteId === item.varianteId;

  return (
    variant.color === item.color &&
    variant.talla === item.talla &&
    (variant.colorSecundario || "") === (item.colorSecundario || "")
  );
};

const getProductoImage = (producto: Producto) => {
  const variantWithImage = producto.variantes.find((variant) => getVarianteImagenPrincipal(variant));
  return variantWithImage ? getVarianteImagenPrincipal(variantWithImage) : undefined;
};

const formatMoney = (value: number) => `Bs ${value.toFixed(2)}`;

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

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [search, setSearch] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("TODO");
  const [productoActivoId, setProductoActivoId] = useState<string | null>(null);
  const [tipoDescuento, setTipoDescuento] = useState<"BS" | "PORCENTAJE">("BS");
  const [valorDescuento, setValorDescuento] = useState<number>(0);

  const watchedItems = watch("items") ?? [];
  const metodoPago = watch("metodoPago");

  const categorias = useMemo(() => {
    const values = productos.map((producto) => producto.categoria?.trim()).filter(Boolean) as string[];
    return ["TODO", ...Array.from(new Set(values))];
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const text = search.trim().toLowerCase();

    return productos.filter((producto) => {
      const matchesCategoria = categoriaActiva === "TODO" || producto.categoria === categoriaActiva;
      const matchesSearch = !text || [producto.nombre, producto.modelo, producto.sku]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text));

      return matchesCategoria && matchesSearch;
    });
  }, [categoriaActiva, productos, search]);

  const productoActivo = productos.find((producto) => producto._id === productoActivoId) ?? null;

  const subtotal = watchedItems.reduce((sum, item) => {
    const producto = productos.find((p) => p._id === item.productoId);
    return sum + (producto?.precioVenta ?? 0) * (item.cantidad || 0);
  }, 0);

  const montoDescuento =
    tipoDescuento === "PORCENTAJE"
      ? Math.min((valorDescuento / 100) * subtotal, subtotal)
      : Math.min(valorDescuento, subtotal);

  const total = Math.max(subtotal - montoDescuento, 0);

  const handleDescuentoChange = (value: number) => {
    const cleaned = Math.max(0, value);
    setValorDescuento(tipoDescuento === "PORCENTAJE" ? Math.min(cleaned, 100) : Math.min(cleaned, subtotal));
  };

  const addVariant = (producto: Producto, variant: VentaVariant) => {
    const stockDisponible = getStockDisponible(variant);
    if (stockDisponible <= 0) {
      toast.error("Esta variante no tiene stock disponible");
      return;
    }

    const existingIndex = watchedItems.findIndex(
      (item) => item.productoId === producto._id && getItemKey(item) === getVariantKey(variant)
    );

    if (existingIndex >= 0) {
      const nextQuantity = (watchedItems[existingIndex].cantidad || 0) + 1;
      if (nextQuantity > stockDisponible) {
        toast.error("No hay mas stock disponible para esta variante");
        return;
      }

      setValue(`items.${existingIndex}.cantidad`, nextQuantity, { shouldValidate: true });
      return;
    }

    append({
      productoId: producto._id,
      varianteId: variant.varianteId,
      color: variant.color,
      colorSecundario: variant.colorSecundario || "",
      talla: variant.talla,
      cantidad: 1,
    });
  };

  const updateQuantity = (index: number, quantity: number) => {
    const item = watchedItems[index];
    const producto = productos.find((p) => p._id === item?.productoId);
    const variant = producto?.variantes.find((v) => matchesVariant(v, item));
    const stockDisponible = variant ? getStockDisponible(variant) : 0;
    const nextQuantity = Math.max(1, Math.min(quantity, stockDisponible || 1));

    setValue(`items.${index}.cantidad`, nextQuantity, { shouldValidate: true });
  };

  const onSubmit = async (data: VentaFormSubmitValues) => {
    try {
      if (data.items.length === 0) {
        toast.error("Agrega al menos un producto");
        return;
      }

      await createVenta({
        items: data.items.map(({ productoId, varianteId, color, colorSecundario, talla, cantidad }) => ({
          productoId,
          varianteId,
          color,
          colorSecundario,
          talla,
          cantidad,
        })),
        metodoPago: data.metodoPago,
        canal: "TIENDA",
        descuento: montoDescuento,
      });

      reset({ items: [], metodoPago: "EFECTIVO", canal: "TIENDA", descuento: 0 });
      setValorDescuento(0);
      setProductoActivoId(null);

      toast.success("Venta registrada correctamente");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar venta");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Selecciona los productos</h2>
            <p className="text-sm text-gray-400">Busca por nombre, modelo o SKU y elige una variante disponible.</p>
          </div>
          <div className="rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            {fields.length} {fields.length === 1 ? "item" : "items"}
          </div>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, modelo o SKU..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/60 focus:bg-white/10"
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              type="button"
              onClick={() => setCategoriaActiva(categoria)}
              className={`shrink-0 rounded-2xl border px-5 py-3 text-sm font-bold transition ${
                categoriaActiva === categoria
                  ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {productosFiltrados.map((producto) => {
            const image = getProductoImage(producto);
            const stockDisponible = producto.variantes.reduce((sum, variant) => sum + getStockDisponible(variant), 0);
            const disabled = stockDisponible <= 0;

            return (
              <button
                key={producto._id}
                type="button"
                onClick={() => setProductoActivoId((current) => current === producto._id ? null : producto._id)}
                className={`group relative min-h-72 overflow-hidden rounded-2xl border text-left shadow-xl transition ${
                  productoActivoId === producto._id
                    ? "border-blue-400 ring-2 ring-blue-400/40"
                    : "border-white/10 hover:border-white/20"
                } ${disabled ? "opacity-55" : ""}`}
              >
                {image ? (
                  <CloudinaryImage
                    src={image}
                    alt={producto.nombre}
                    width={500}
                    height={620}
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
                <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-3xl font-light text-white shadow-lg">
                  +
                </div>
                <div className="absolute inset-x-0 bottom-0 space-y-1 p-5">
                  <p className="line-clamp-1 text-lg font-bold text-white drop-shadow">{producto.nombre}</p>
                  <p className="line-clamp-1 text-sm text-white/80">{producto.modelo}</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-2xl font-bold text-white drop-shadow">{formatMoney(producto.precioVenta)}</p>
                    <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      Stock {stockDisponible}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {productosFiltrados.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-gray-400">
            No hay productos que coincidan con la busqueda.
          </div>
        )}

        {productoActivo && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">{productoActivo.nombre}</h3>
                <p className="text-sm text-gray-400">{productoActivo.modelo}</p>
              </div>
              <button
                type="button"
                onClick={() => setProductoActivoId(null)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-gray-300 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {productoActivo.variantes.map((variant, index) => {
                const image = getVarianteImagenPrincipal(variant) || getProductoImage(productoActivo);
                const stockDisponible = getStockDisponible(variant);
                const disabled = stockDisponible <= 0;

                return (
                  <button
                    key={`${getVariantKey(variant)}-${index}`}
                    type="button"
                    onClick={() => addVariant(productoActivo, variant)}
                    disabled={disabled}
                    className="flex gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-left transition hover:border-blue-400/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {image ? (
                      <CloudinaryImage
                        src={image}
                        alt={`${productoActivo.nombre} ${variant.color} ${variant.talla}`}
                        width={96}
                        height={96}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 shrink-0 rounded-lg bg-slate-800" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">
                        {variant.color}{variant.colorSecundario ? ` / ${variant.colorSecundario}` : ""}
                      </p>
                      <p className="text-sm text-gray-400">Talla {variant.talla}</p>
                      <p className="mt-2 text-sm font-semibold text-cyan-300">Stock {stockDisponible}</p>
                    </div>
                    <span className="self-center rounded-full bg-blue-600 px-3 py-1 text-lg leading-none text-white">+</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl xl:sticky xl:top-6 xl:self-start">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Lista de venta</h3>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300">{fields.length}</span>
        </div>

        <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1 xl:max-h-[48vh]">
          {fields.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
              Todavia no agregaste productos.
            </div>
          )}

          {fields.map((field, index) => {
            const item = watchedItems[index];
            const producto = productos.find((p) => p._id === item?.productoId);
            const variant = producto?.variantes.find((v) => matchesVariant(v, item));
            const image = variant ? getVarianteImagenPrincipal(variant) || (producto ? getProductoImage(producto) : undefined) : undefined;
            const stockDisponible = variant ? getStockDisponible(variant) : 0;
            const precio = producto?.precioVenta ?? 0;
            const cantidad = item?.cantidad || 1;

            return (
              <div key={field.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex gap-3">
                  {image ? (
                    <CloudinaryImage
                      src={image}
                      alt={producto?.nombre || "Producto"}
                      width={88}
                      height={88}
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 shrink-0 rounded-lg bg-slate-800" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold text-white">{producto?.nombre || "Producto"}</p>
                        <p className="line-clamp-1 text-xs text-gray-400">{producto?.modelo || "-"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded-full px-2 py-1 text-sm text-red-300 hover:bg-red-500/10"
                      >
                        Quitar
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-300">
                      {item.color}{item.colorSecundario ? ` / ${item.colorSecundario}` : ""} · Talla {item.talla}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex h-9 items-center overflow-hidden rounded-lg border border-white/10">
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, cantidad - 1)}
                          className="h-full px-3 text-lg text-gray-300 hover:bg-white/10"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          {...register(`items.${index}.cantidad`, { valueAsNumber: true, min: 1 })}
                          min={1}
                          max={stockDisponible}
                          onChange={(event) => updateQuantity(index, Number(event.target.value) || 1)}
                          className="h-full w-12 border-x border-white/10 bg-transparent text-center text-sm text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, cantidad + 1)}
                          disabled={cantidad >= stockDisponible}
                          className="h-full px-3 text-lg text-gray-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Stock {stockDisponible}</p>
                        <p className="font-bold text-cyan-300">{formatMoney(precio * cantidad)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <input type="hidden" {...register(`items.${index}.productoId`)} />
                <input type="hidden" {...register(`items.${index}.varianteId`)} />
                <input type="hidden" {...register(`items.${index}.color`)} />
                <input type="hidden" {...register(`items.${index}.colorSecundario`)} />
                <input type="hidden" {...register(`items.${index}.talla`)} />
              </div>
            );
          })}
        </div>

        <div className="space-y-4 border-t border-white/10 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Metodo de pago</label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold transition ${metodoPago === "EFECTIVO" ? "border-cyan-500 bg-cyan-500/20 text-cyan-200" : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                <input type="radio" {...register("metodoPago")} value="EFECTIVO" className="hidden" />
                Efectivo
              </label>
              <label className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold transition ${metodoPago === "QR" ? "border-cyan-500 bg-cyan-500/20 text-cyan-200" : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                <input type="radio" {...register("metodoPago")} value="QR" className="hidden" />
                QR
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Descuento</label>
            <div className="flex gap-2">
              <div className="flex overflow-hidden rounded-xl border border-white/10">
                <button type="button" onClick={() => { setTipoDescuento("BS"); setValorDescuento(0); }} className={`px-3 text-sm font-bold ${tipoDescuento === "BS" ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-gray-400"}`}>Bs</button>
                <button type="button" onClick={() => { setTipoDescuento("PORCENTAJE"); setValorDescuento(0); }} className={`px-3 text-sm font-bold ${tipoDescuento === "PORCENTAJE" ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-gray-400"}`}>%</button>
              </div>
              <input
                type="number"
                min={0}
                max={tipoDescuento === "PORCENTAJE" ? 100 : subtotal}
                step="0.01"
                value={valorDescuento || ""}
                onChange={(event) => handleDescuentoChange(Number(event.target.value) || 0)}
                placeholder="0.00"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-amber-400/60"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-white/5 p-4">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-amber-300">
              <span>Descuento</span>
              <span>-{formatMoney(montoDescuento)}</span>
            </div>
            <div className="flex items-end justify-between border-t border-white/10 pt-3">
              <span className="font-semibold text-gray-300">Total</span>
              <span className="text-3xl font-bold text-white">{formatMoney(total)}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-full py-3 text-base"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || fields.length === 0}
          >
            {isSubmitting ? "Procesando..." : "Confirmar venta"}
          </button>
        </div>
      </aside>
    </div>
  );
}
