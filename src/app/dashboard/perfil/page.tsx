"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getPerfil, updatePerfil } from "@/services/usuario.service";
import type { PerfilUsuario } from "@/types/usuario";
import {
  updatePerfilSchema,
  type UpdatePerfilInput,
} from "@/schemas/perfil.schema";

function formatDate(value?: string) {
  if (!value) {
    return "No disponible";
  }

  return new Date(value).toLocaleString("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DashboardPerfilPage() {
  const { update } = useSession();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdatePerfilInput>({
    resolver: zodResolver(updatePerfilSchema),
    defaultValues: {
      nombreCompleto: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const loadPerfil = async () => {
      try {
        const data = await getPerfil();
        setPerfil(data);
        reset({
          nombreCompleto: data.nombreCompleto,
          email: data.email,
          password: "",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al cargar perfil";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadPerfil();
  }, [reset]);

  const profileStats = useMemo(
    () => [
      {
        label: "Rol",
        value: perfil?.rol || "-",
      },
      {
        label: "Estado",
        value: perfil?.estaActivo ? "Activo" : "Inactivo",
      },
      {
        label: "Creado",
        value: formatDate(perfil?.createdAt),
      },
      {
        label: "Ultimo acceso",
        value: formatDate(perfil?.ultimoAcceso),
      },
    ],
    [perfil]
  );

  const onSubmit = async (data: UpdatePerfilInput) => {
    try {
      setSaving(true);

      const updatedPerfil = await updatePerfil({
        nombreCompleto: data.nombreCompleto,
        email: data.email,
        password: data.password,
      });

      setPerfil(updatedPerfil);
      reset({
        nombreCompleto: updatedPerfil.nombreCompleto,
        email: updatedPerfil.email,
        password: "",
      });

      await update({
        nombreCompleto: updatedPerfil.nombreCompleto,
        email: updatedPerfil.email,
      });

      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al actualizar perfil";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-white/10" />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="h-72 animate-pulse rounded-3xl bg-white/10" />
          <div className="h-72 animate-pulse rounded-3xl bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Mi perfil</h1>
        <p className="mt-2 text-sm text-slate-600">
          Consulta tus datos de acceso y actualiza la informacion personal de tu
          cuenta.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface-card-strong rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 text-3xl font-bold text-white">
              {perfil?.nombreCompleto?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
                Cuenta
              </p>
              <h2 className="text-2xl font-semibold">{perfil?.nombreCompleto}</h2>
              <p className="text-sm text-slate-600">{perfil?.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {profileStats.map((item) => (
              <article
                key={item.label}
                className="surface-subcard rounded-2xl p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {item.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-card-strong rounded-3xl p-6">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
              Editar datos
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Actualiza tu informacion
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Nombre completo</label>
              <input
                {...register("nombreCompleto")}
                className="input"
                placeholder="Nombre completo"
              />
              {errors.nombreCompleto && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.nombreCompleto.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">Correo electronico</label>
              <input
                {...register("email")}
                className="input"
                placeholder="correo@ejemplo.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">Nueva contrasena</label>
              <input
                {...register("password")}
                type="password"
                className="input"
                placeholder="Opcional"
              />
              <p className="mt-1 text-xs text-slate-500">
                Dejalo vacio si no deseas cambiar tu contrasena.
              </p>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>


            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving || !isDirty}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  reset({
                    nombreCompleto: perfil?.nombreCompleto || "",
                    email: perfil?.email || "",
                    password: "",
                  })
                }
                disabled={saving}
              >
                Restaurar
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
