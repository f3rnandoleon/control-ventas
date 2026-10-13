import type { Sucursal } from "@/types/sucursal";

export async function getSucursales(): Promise<Sucursal[]> {
  const res = await fetch("/api/admin/sucursales", {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al obtener sucursales");
  }
  return res.json();
}

export async function crearSucursal(data: Partial<Sucursal>): Promise<Sucursal> {
  const res = await fetch("/api/admin/sucursales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al crear sucursal");
  }
  return res.json();
}

export async function actualizarSucursal(id: string, data: Partial<Sucursal>): Promise<Sucursal> {
  const res = await fetch(`/api/admin/sucursales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al actualizar sucursal");
  }
  return res.json();
}

export async function toggleActivarSucursal(id: string, activa: boolean): Promise<Sucursal> {
  const res = await fetch(`/api/admin/sucursales/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activa }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al cambiar estado de sucursal");
  }
  return res.json();
}
