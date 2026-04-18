"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Producto } from "@/types/producto";
import {
  createProductoSchema,
} from "@/schemas/producto.schema";

type ProductoFormValues = z.input<typeof createProductoSchema>;
type ProductoFormSubmitValues = z.output<typeof createProductoSchema>;

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
    setValue,
    formState: { errors },
  } = useForm<ProductoFormValues, unknown, ProductoFormSubmitValues>({
    resolver: zodResolver(createProductoSchema),
    defaultValues: {
      nombre: initialData?.nombre || "",
      modelo: initialData?.modelo || "",
      precioVenta: initialData?.precioVenta || 0,
      precioCosto: initialData?.precioCosto || 0,
      categoria: initialData?.categoria || "Chompas",
    },
  });

  const [categoriaSelect, setCategoriaSelect] = useState(() => {
    const isKnown = ["Chompas", "Poleras", "Ponchos"].includes(
      initialData?.categoria || "Chompas"
    );
    return isKnown ? initialData?.categoria || "Chompas" : "Otra";
  });

  return (
    <form
      onSubmit={handleSubmit((data) => {
        if (initialData?._id) {
          // Si estamos editando un producto, evitamos enviar el array de variantes
          // (que viene vacío por defecto en el form) para no sobreescribir las existentes.
          const { variantes: _, ...rest } = data;
          onSubmit(rest as Partial<Producto>);
        } else {
          onSubmit(data as Partial<Producto>);
        }
      })}
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

      <div>
        <label className="label">Categoría</label>
        
        <select 
          className="input w-full mb-2"
          value={categoriaSelect}
          onChange={(e) => {
            setCategoriaSelect(e.target.value);
            if (e.target.value !== "Otra") {
              setValue("categoria", e.target.value, { shouldValidate: true });
            } else {
              setValue("categoria", "", { shouldValidate: true });
            }
          }}
        >
          <option value="Chompas">Chompas</option>
          <option value="Poleras">Poleras</option>
          <option value="Ponchos">Ponchos</option>
          <option value="Otra">Otra...</option>
        </select>

        <input
          {...register("categoria")}
          className={`input w-full ${categoriaSelect !== "Otra" ? "hidden" : ""}`}
          placeholder="Escribe la nueva categoría"
        />

        {errors.categoria && (
          <p className="mt-1 text-xs text-red-400">{errors.categoria?.message as string}</p>
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
