import {
  Usuario,
  CreateUsuarioDTO,
  UpdateUsuarioDTO,
  PerfilUsuario,
  UpdatePerfilDTO,
} from "@/types/usuario";

export async function getUsuarios(): Promise<Usuario[]> {
  const res = await fetch("/api/usuarios");
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error al obtener usuarios");
  }

  return data;
}

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

export async function getPerfil(): Promise<PerfilUsuario> {
  const res = await fetch("/api/perfil");
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error al obtener perfil");
  }

  return data;
}

export async function updatePerfil(data: UpdatePerfilDTO) {
  const res = await fetch("/api/perfil", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.message || "Error al actualizar perfil");
  }

  return responseData;
}
