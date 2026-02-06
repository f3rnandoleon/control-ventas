import { Usuario, CreateUsuarioDTO, UpdateUsuarioDTO } from "@/types/usuario";

/* ============================
   Obtener usuarios
============================ */
export async function getUsuarios(): Promise<Usuario[]> {
  const res = await fetch("/api/usuarios");

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error al obtener usuarios");
  }

  return data;
}

/* ============================
   Crear usuario
============================ */
export async function createUsuario(data: CreateUsuarioDTO) {
  const res = await fetch("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al crear usuario");
  }

  return res.json();
}

/* ============================
   Actualizar usuario
============================ */
export async function updateUsuario(id: string, data: UpdateUsuarioDTO) {
  const res = await fetch(`/api/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al actualizar usuario");
  }

  return res.json();
}

