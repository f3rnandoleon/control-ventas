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

  const { fields, append } = useFieldArray({ control, name: "items" });
  const [search, setSearch] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("TODO");
  const [productoActivo, setProductoActivo] = useState<Producto | null>(null);
  const [listaCompleta, setListaCompleta] = useState(false);
  const [tipoDescuento, setTipoDescuento] = useState<"BS" | "PORCENTAJE">("BS");
  const [valorDescuento, setValorDescuento] = useState<number>(0);

  const watchedItems = watch("items") ?? [];
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
      toast.success("Variante adicionada correctamente");
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
    toast.success("Variante adicionada correctamente");
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
      setProductoActivo(null);
      setListaCompleta(false);
      toast.success("Venta registrada correctamente");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar venta");
    }
  };

  return (
    <div className="surface-card-strong flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden rounded-none md:h-[calc(100dvh-3rem)] md:rounded-2xl">
      <div className="shrink-0 space-y-3 border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          Seleccione los productos.
          <div className="w-fit rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            {fields.length} {fields.length === 1 ? "item" : "items"}
          </div>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, modelo o SKU..."
          className="input py-3 text-sm"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              type="button"
              onClick={() => setCategoriaActiva(categoria)}
              className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition sm:text-sm ${
                categoriaActiva === categoria
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {productosFiltrados.map((producto) => {
            const image = getProductoImage(producto);
            const stockDisponible = producto.variantes.reduce((sum, variant) => sum + getStockDisponible(variant), 0);
            const disabled = stockDisponible <= 0;

            return (
              <button
                key={producto._id}
                type="button"
                onClick={() => setProductoActivo(producto)}
                className={`group relative aspect-[4/5] overflow-hidden rounded-xl border text-left shadow-lg transition hover:-translate-y-0.5 ${
                  disabled ? "border-white/5 opacity-55" : "border-white/10 hover:border-blue-400/70"
                }`}
              >
                {image ? (
                  <CloudinaryImage
                    src={image}
                    alt={producto.nombre}
                    width={320}
                    height={400}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-2xl font-light text-white shadow-lg">
                  +
                </span>
                <div className="absolute inset-x-0 bottom-0 space-y-1 p-3">
                  <p className="line-clamp-1 text-sm font-bold !text-white drop-shadow sm:text-base">{producto.nombre}</p>
                  <p className="line-clamp-1 text-[11px] !text-white/80 sm:text-xs">{producto.modelo}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-bold !text-white drop-shadow sm:text-lg">{formatMoney(producto.precioVenta)}</p>
                    <p className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold !text-white">
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
      </div>

      <button
        type="button"
        onClick={() => setListaCompleta(true)}
        className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-2xl shadow-sky-900/25 transition hover:bg-sky-500 sm:text-sm"
      >
        <span>Lista de venta</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{fields.length}</span>
        <span className="text-lg leading-none">^</span>
      </button>

      {listaCompleta && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm">
          <div className="surface-card-strong absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col rounded-t-2xl p-3 shadow-2xl sm:p-5">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold sm:text-lg">Lista de venta</h3>
                <p className="text-[11px] text-gray-400 sm:text-xs">Variantes seleccionadas para confirmar.</p>
              </div>
              <button
                type="button"
                onClick={() => setListaCompleta(false)}
                aria-label="Ocultar lista de venta"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-xl font-bold text-[var(--accent-strong)] hover:bg-white/10"
              >
                v
              </button>
            </div>

            <div className="hidden">
              {fields.map((field, index) => (
                <div key={field.id}>
                  <input type="hidden" {...register(`items.${index}.productoId`)} />
                  <input type="hidden" {...register(`items.${index}.varianteId`)} />
                  <input type="hidden" {...register(`items.${index}.color`)} />
                  <input type="hidden" {...register(`items.${index}.colorSecundario`)} />
                  <input type="hidden" {...register(`items.${index}.talla`)} />
                  <input type="hidden" {...register(`items.${index}.cantidad`, { valueAsNumber: true })} />
                </div>
              ))}
            </div>

            <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto text-xs sm:gap-4 sm:text-sm lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
              <div className="surface-subcard max-h-64 overflow-y-auto rounded-xl p-3 sm:max-h-[58vh] sm:p-4">
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Variantes agregadas</h4>
                <div className="space-y-2">
                  {fields.length === 0 && (
                    <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-gray-400">
                      Todavia no agregaste variantes.
                    </p>
                  )}
                  {fields.map((field, index) => {
                    const item = watchedItems[index];
                    const producto = productos.find((p) => p._id === item?.productoId);
                    const variant = producto?.variantes.find((candidate) => {
                      if (item?.varianteId && candidate.varianteId) return candidate.varianteId === item.varianteId;

                      return (
                        candidate.color === item?.color &&
                        candidate.talla === item?.talla &&
                        (candidate.colorSecundario || "") === (item?.colorSecundario || "")
                      );
                    });
                    const image = variant ? getVarianteImagenPrincipal(variant) || (producto ? getProductoImage(producto) : undefined) : undefined;
                    const cantidad = item?.cantidad || 1;
                    const precio = producto?.precioVenta ?? 0;

                    return (
                      <div key={field.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="flex items-start gap-2">
                          {image ? (
                            <CloudinaryImage
                              src={image}
                              alt={producto?.nombre || "Producto"}
                              width={56}
                              height={56}
                              className="h-14 w-14 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-800" />
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-semibold">{producto?.nombre || "Producto"}</p>
                            <p className="line-clamp-1 text-[11px] text-gray-400 sm:text-xs">{producto?.modelo || "-"}</p>
                            <p className="mt-1 text-[11px] text-gray-400 sm:text-xs">
                              {item.color}{item.colorSecundario ? ` / ${item.colorSecundario}` : ""} - Talla {item.talla}
                            </p>
                          </div>
                          <div className="ml-auto shrink-0 text-right">
                            <p className="text-[11px] text-gray-400 sm:text-xs">Cant. {cantidad}</p>
                            <p className="font-bold text-cyan-300">{formatMoney(precio * cantidad)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="surface-subcard space-y-3 rounded-xl p-3 sm:p-4">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Descuento</label>
                  <div className="flex gap-2">
                    <div className="flex overflow-hidden rounded-xl border border-white/10">
                      <button type="button" onClick={() => { setTipoDescuento("BS"); setValorDescuento(0); }} className={`px-3 text-xs font-bold sm:text-sm ${tipoDescuento === "BS" ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-gray-400"}`}>Bs</button>
                      <button type="button" onClick={() => { setTipoDescuento("PORCENTAJE"); setValorDescuento(0); }} className={`px-3 text-xs font-bold sm:text-sm ${tipoDescuento === "PORCENTAJE" ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-gray-400"}`}>%</button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={tipoDescuento === "PORCENTAJE" ? 100 : subtotal}
                      step="0.01"
                      value={valorDescuento || ""}
                      onChange={(event) => handleDescuentoChange(Number(event.target.value) || 0)}
                      placeholder="0.00"
                      className="input min-w-0 flex-1 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="surface-subcard space-y-3 rounded-xl p-3 sm:p-4">
                  <div className="flex justify-between text-xs text-gray-400 sm:text-sm">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-amber-300 sm:text-sm">
                    <span>Descuento</span>
                    <span>-{formatMoney(montoDescuento)}</span>
                  </div>
                  <div className="flex items-end justify-between border-t border-white/10 pt-3">
                    <span className="font-semibold text-gray-300">Total</span>
                    <span className="text-xl font-bold sm:text-2xl">{formatMoney(total)}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary w-full py-3 text-sm sm:text-base"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting || fields.length === 0}
                  >
                    {isSubmitting ? "Procesando..." : "Confirmar venta"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {productoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 pt-24 backdrop-blur-sm md:pt-4">
          <div className="surface-card-strong max-h-[82vh] w-full max-w-4xl overflow-hidden rounded-2xl md:max-h-[88vh]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
              <div>
                <h3 className="text-xl font-bold">{productoActivo.nombre}</h3>
                <p className="text-sm text-gray-400">{productoActivo.modelo}</p>
              </div>
              <button
                type="button"
                onClick={() => setProductoActivo(null)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-gray-300 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
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
                      className="surface-subcard flex gap-3 rounded-xl p-3 text-left transition hover:border-blue-400/60 disabled:cursor-not-allowed disabled:opacity-50"
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
                        <p className="font-semibold">
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
          </div>
        </div>
      )}
    </div>
  );
}
