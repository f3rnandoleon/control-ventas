"use client";

import { useEffect, useState } from "react";
import { Usuario, UserRole } from "@/types/usuario";

interface FormState {
  fullname: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  password?: string;
}

export default function UsuarioModal({
  open,
  onClose,
  initialData,
  onSave,
  error,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Usuario | null;
  onSave: (data: FormState) => void;
  error?: string | null;
  loading?: boolean;

}) {
  const [form, setForm] = useState<FormState>({
    fullname: "",
    email: "",
    role: "VENDEDOR",
    isActive: true,
    password: "",
  });
  const [errors, setErrors] = useState<{
    fullname?: string;
    email?: string;
    password?: string;
  }>({});
  const validate = () => {
    const e: typeof errors = {};

    if (!form.fullname || form.fullname.trim().length < 3) {
      e.fullname = "El nombre debe tener al menos 3 caracteres";
    }

    if (
      !form.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      e.email = "Email no válido";
    }

    if (!initialData) {
      if (!form.password || form.password.length < 6) {
        e.password = "La contraseña debe tener al menos 6 caracteres";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const payload: any = {
      fullname: form.fullname,
      email: form.email,
      role: form.role,
      isActive: form.isActive,
    };

    if (form.password && form.password.trim() !== "") {
      payload.password = form.password;
    }

    onSave(payload);
  };


  /* 🔑 SOLUCIÓN AL BUG */
  useEffect(() => {
    if (initialData) {
      setForm({
        fullname: initialData.fullname,
        email: initialData.email,
        role: initialData.role,
        isActive: initialData.isActive,
        password: "",
      });
    } else {
      setForm({
        fullname: "",
        email: "",
        role: "VENDEDOR",
        isActive: true,
        password: "",
      });
    }
  }, [initialData, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      

      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-cyan-400 mb-4">
          {initialData ? "Editar usuario" : "Nuevo usuario"}
        </h2>

        {/* Nombre */}
        <input
          className="input mb-1"
          placeholder="Nombre completo"
          value={form.fullname}
          onChange={(e) =>
            setForm({ ...form, fullname: e.target.value })
          }
        />
        {errors.fullname && (
          <p className="text-xs text-red-400 mb-2">
            {errors.fullname}
          </p>
        )}


        {/* Email (EDITABLE) */}
        <input
          className="input mb-1"
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />
        {errors.email && (
          <p className="text-xs text-red-400 mb-2">
            {errors.email}
          </p>
        )}


        {/* Password solo al crear */}
       {!initialData && (
          <>
            <input
              className="input mb-1"
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />
            {errors.password && (
              <p className="text-xs text-red-400 mb-2">
                {errors.password}
              </p>
            )}
          </>
        )}


        {/* Rol */}
        <select
          className="input mb-3"
          value={form.role}
          onChange={(e) =>
            setForm({
              ...form,
              role: e.target.value as UserRole,
            })
          }
        >
          <option value="ADMIN">ADMIN</option>
          <option value="VENDEDOR">VENDEDOR</option>
          <option value="CLIENTE">CLIENTE</option>
        </select>

        {/* Estado */}
        <label className="flex items-center gap-2 text-sm text-gray-300 mb-4">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) =>
              setForm({ ...form, isActive: e.target.checked })
            }
          />
          Usuario activo
        </label>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            className="btn-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="btn-primary disabled:opacity-50"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>


        </div>
      </div>
    </div>
  );
}
