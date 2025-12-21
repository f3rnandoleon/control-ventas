"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
} from "@/services/usuario.service";
import UsuarioTable from "@/components/usuarios/UsuarioTable";
import UsuarioModal from "@/components/usuarios/UsuarioModal";
import { Usuario } from "@/types/usuario";

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const load = async () => {
    setUsuarios(await getUsuarios());
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (data: any) => {
    try {
      setLoading(true);
      setError(null);

      if (editing) {
        await updateUsuario(editing._id, data);
        toast.success("Usuario actualizado correctamente");
      } else {
        await createUsuario(data);
        toast.success("Usuario creado correctamente");
      }

      setOpen(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar usuario");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>

      <button
        className="btn-primary"
        onClick={() => {
          setEditing(null);
          setOpen(true);
          setError(null);
        }}
      >
        + Nuevo usuario
      </button>

      <UsuarioTable
        usuarios={usuarios}
        onEdit={(u) => {
          setEditing(u);
          setOpen(true);
          setError(null);
        }}
      />

      <UsuarioModal
        open={open}
        initialData={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setError(null);
        }}
        onSave={handleSave}
        error={error}
        loading={loading}
      />
    </div>
  );
}
