import type { ICupon, IPromocion } from "@/types/promocion";

async function parseResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const firstFieldError = Array.isArray(data?.errors) && data.errors[0]?.message;
    throw new Error(firstFieldError || data?.message || fallbackMsg);
  }
  return data as T;
}

export async function getAdminPromociones(): Promise<IPromocion[]> {
  const res = await fetch("/api/admin/promociones", { cache: "no-store" });
  return parseResponse<IPromocion[]>(res, "Error al cargar promociones");
}

export async function createAdminPromocionClient(
  payload: Record<string, unknown>
): Promise<IPromocion> {
  const res = await fetch("/api/admin/promociones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<IPromocion>(res, "Error al crear promoción");
}

export async function updateAdminPromocionClient(
  id: string,
  payload: Record<string, unknown>
): Promise<IPromocion> {
  const res = await fetch(`/api/admin/promociones/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<IPromocion>(res, "Error al actualizar promoción");
}

export async function toggleAdminPromocionClient(
  id: string
): Promise<{ message: string; promocion: IPromocion }> {
  const res = await fetch(`/api/admin/promociones/${id}/toggle`, {
    method: "PATCH",
  });
  return parseResponse<{ message: string; promocion: IPromocion }>(
    res,
    "Error al cambiar estado de la promoción"
  );
}

export async function deleteAdminPromocionClient(id: string): Promise<void> {
  const res = await fetch(`/api/admin/promociones/${id}`, {
    method: "DELETE",
  });
  await parseResponse<{ message: string }>(res, "Error al eliminar promoción");
}

export async function getAdminCupones(): Promise<ICupon[]> {
  const res = await fetch("/api/admin/cupones", { cache: "no-store" });
  return parseResponse<ICupon[]>(res, "Error al cargar cupones");
}

export async function createAdminCuponClient(
  payload: Record<string, unknown>
): Promise<ICupon> {
  const res = await fetch("/api/admin/cupones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ICupon>(res, "Error al crear cupón");
}

export async function updateAdminCuponClient(
  id: string,
  payload: Record<string, unknown>
): Promise<ICupon> {
  const res = await fetch(`/api/admin/cupones/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ICupon>(res, "Error al actualizar cupón");
}

export async function deleteAdminCuponClient(id: string): Promise<void> {
  const res = await fetch(`/api/admin/cupones/${id}`, {
    method: "DELETE",
  });
  await parseResponse<{ message: string }>(res, "Error al eliminar cupón");
}
