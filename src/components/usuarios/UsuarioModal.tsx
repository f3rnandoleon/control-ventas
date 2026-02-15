"use client";

import { useEffect } from "react";
import { Usuario, UserRole, CreateUsuarioDTO, UpdateUsuarioDTO } from "@/types/usuario";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUsuarioSchema, updateUsuarioSchema, CreateUsuarioInput, UpdateUsuarioInput } from "@/schemas/usuario.schema";

interface UsuarioModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: Usuario | null;
  onSave: (data: CreateUsuarioDTO | UpdateUsuarioDTO) => void;
  loading?: boolean;
}

export default function UsuarioModal({
  open,
  onClose,
  initialData,
  onSave,
  loading,
}: UsuarioModalProps) {
  const isEditing = !!initialData;
  const Schema = isEditing ? updateUsuarioSchema : createUsuarioSchema;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUsuarioInput | UpdateUsuarioInput>({
    resolver: zodResolver(Schema),
    defaultValues: {
      fullname: "",
      email: "",
      role: "VENDEDOR",
      isActive: true,
      password: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          fullname: initialData.fullname,
          email: initialData.email,
          role: initialData.role,
          isActive: initialData.isActive,
          password: "",
        });
      } else {
        reset({
          fullname: "",
          email: "",
          role: "VENDEDOR",
          isActive: true,
          password: "",
        });
      }
    }
  }, [initialData, open, reset]);

  const onSubmit = (data: CreateUsuarioInput | UpdateUsuarioInput) => {
    onSave(data as CreateUsuarioDTO | UpdateUsuarioDTO);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-cyan-400 mb-4">
          {initialData ? "Editar usuario" : "Nuevo usuario"}
        </h2>

        {/* Nombre */}
        <div className="mb-4">
          <input
            {...register("fullname")}
            className="input w-full"
            placeholder="Nombre completo"
          />
          {errors.fullname && (
            <p className="text-xs text-red-400 mt-1">
              {errors.fullname.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="mb-4">
          <input
            {...register("email")}
            className="input w-full"
            placeholder="Email"
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-4">
          <input
            {...register("password")}
            className="input w-full"
            type="password"
            placeholder={initialData ? "Nueva contraseña (opcional)" : "Contraseña"}
          />
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Rol */}
        <div className="mb-4">
          <select
            {...register("role")}
            className="input w-full"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="VENDEDOR">VENDEDOR</option>
            <option value="CLIENTE">CLIENTE</option>
          </select>
          {errors.role && (
            <p className="text-xs text-red-400 mt-1">
              {errors.role.message}
            </p>
          )}
        </div>

        {/* Estado */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              {...register("isActive")}
              className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            Usuario activo
          </label>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
