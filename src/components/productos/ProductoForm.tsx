"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Producto } from "@/types/producto";
import {
  createProductoSchema,
} from "@/schemas/producto.schema";

type ProductoFormValues = z.input<typeof createProductoSchema>;

export default function ProductoForm({
  initialData,
  onSubmit,
}: {
  initialData?: Partial<Producto>;
  onSubmit: (data: Partial<Producto>) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(createProductoSchema),
    defaultValues: {
      nombre: initialData?.nombre || "",
      modelo: initialData?.modelo || "",
      precioVenta: initialData?.precioVenta || 0,
      precioCosto: initialData?.precioCosto || 0,
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data as Partial<Producto>))}
      className="space-y-5"
    >
      <div>
        <label className="label">Nombre del producto</label>
        <input
          {...register("nombre")}
          className="input w-full"
          placeholder="Chompa Invierno"
        />
        {errors.nombre && (
          <p className="mt-1 text-xs text-red-400">{errors.nombre.message}</p>
        )}
      </div>

      <div>
        <label className="label">Modelo</label>
        <input
          {...register("modelo")}
          className="input w-full"
          placeholder="INV-2025"
        />
        {errors.modelo && (
          <p className="mt-1 text-xs text-red-400">{errors.modelo.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Precio venta (Bs)</label>
          <input
            {...register("precioVenta", { valueAsNumber: true })}
            type="number"
            className="input w-full"
            step="0.01"
          />
          {errors.precioVenta && (
            <p className="mt-1 text-xs text-red-400">
              {errors.precioVenta.message}
            </p>
          )}
        </div>

        <div>
          <label className="label">Precio costo (Bs)</label>
          <input
            {...register("precioCosto", { valueAsNumber: true })}
            type="number"
            className="input w-full"
            step="0.01"
          />
          {errors.precioCosto && (
            <p className="mt-1 text-xs text-red-400">
              {errors.precioCosto.message}
            </p>
          )}
        </div>

        <div>
          <label className="label">SKU</label>
          <input
            className="input w-full cursor-not-allowed text-gray-400"
            value={initialData?.sku || "Generado automaticamente"}
            disabled
          />
        </div>
      </div>

      <button type="submit" className="btn-primary">
        {initialData?._id ? "Actualizar producto" : "Guardar producto"}
      </button>
    </form>
  );
}
