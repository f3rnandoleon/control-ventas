"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Producto } from "@/types/producto";
import { createProductoSchema, updateProductoSchema, CreateProductoInput, UpdateProductoInput } from "@/schemas/producto.schema";

export default function ProductoForm({
  initialData,
  onSubmit,
}: {
  initialData?: Partial<Producto>;
  onSubmit: (data: Partial<Producto>) => void;
}) {
  const isEditing = !!initialData?._id;

  // Usamos createProductoSchema (base) o updateProductoSchema según el caso
  // Nota: Para la edición, updateProductoSchema hace todos los campos opcionales
  const Schema = isEditing ? updateProductoSchema : createProductoSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductoInput | UpdateProductoInput>({
    resolver: zodResolver(Schema),
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
          <p className="text-xs text-red-400 mt-1">
            {errors.nombre.message}
          </p>
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
          <p className="text-xs text-red-400 mt-1">
            {errors.modelo.message}
          </p>
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
          {/* El error puede venir del campo o del refine (root) si es complejo, 
              pero Zod suele mapear refine a path si se especifica */}
          {errors.precioVenta && (
            <p className="text-xs text-red-400 mt-1">
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
            <p className="text-xs text-red-400 mt-1">
              {errors.precioCosto.message}
            </p>
          )}
        </div>

        <div>
          <label className="label">SKU</label>
          <input
            className="input bg-white/5 text-gray-400 w-full"
            value={initialData?.sku || "Generado automáticamente"}
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
