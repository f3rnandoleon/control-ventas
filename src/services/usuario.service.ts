import { Usuario } from "@/types/usuario";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/* ============================
   Obtener usuarios
============================ */
export async function getUsuarios(): Promise<Usuario[]> {
  const res = await fetch("/api/usuarios", {
    headers: authHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error al obtener usuarios");
  }

  return data;
}

/* ============================
   Crear usuario
============================ */
export async function createUsuario(data: {
  fullname: string;
  email: string;
  role: string;
  password: string;
  isActive?: boolean;
}) {
  if (!data.password || data.password.trim() === "") {
    throw new Error("La contraseña es obligatoria");
  }

  const res = await fetch("/api/usuarios", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Error al crear usuario");
  }

  return result;
}

/* ============================
   Actualizar usuario
============================ */
export async function updateUsuario(
  id: string,
  data: Partial<{
    fullname: string;
    email: string;
    role: string;
    isActive: boolean;
    password: string;
  }>
): Promise<Usuario> {
  // 🔐 eliminar password vacío si existe
  const payload: any = { ...data };

  if (!payload.password || payload.password.trim() === "") {
    delete payload.password;
  }

  const res = await fetch(`/api/usuarios/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Error al actualizar usuario");
  }

  return result;
}
