"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from "@/services/usuario.service";
import UsuarioTable from "@/components/usuarios/UsuarioTable";
import UsuarioModal from "@/components/usuarios/UsuarioModal";
import { Usuario, CreateUsuarioDTO, UpdateUsuarioDTO } from "@/types/usuario";

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const load = async () => {
    setUsuarios(await getUsuarios());
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (u: Usuario) => {
    if (!confirm(`¿Estás seguro de que deseas dar de baja al usuario "${u.nombreCompleto}"? Ya no podrá iniciar sesión en el sistema.`)) {
      return;
    }
    try {
      await deleteUsuario(u._id);
      toast.success("Usuario dado de baja exitosamente");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al dar de baja");
    }
  };

  const handleSave = async (
      data: CreateUsuarioDTO | UpdateUsuarioDTO
    ) => {
      try {
        setLoading(true);

        if (editing) {
          await updateUsuario(editing._id, data);
          toast.success("Usuario actualizado correctamente");
        } else {
          await createUsuario(data as CreateUsuarioDTO);
          toast.success("Usuario creado correctamente");
        }

        setOpen(false);
        setEditing(null);
        load();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al guardar usuario";

        toast.error(message);
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
        }}
      >
        + Nuevo usuario
      </button>

      <UsuarioTable
        usuarios={usuarios}
        onEdit={(u) => {
          setEditing(u);
          setOpen(true);
        }}
        onDelete={handleDelete}
      />

      <UsuarioModal
        open={open}
        initialData={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        loading={loading}
      />
    </div>
  );
}
