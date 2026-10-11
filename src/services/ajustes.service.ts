import { AjustesSistemaDTO, PublicPoliticasResponse } from "@/types/ajustes";
import { UpdateAjustesInput } from "@/schemas/ajustes.schema";

export async function getAjustesAdmin(): Promise<AjustesSistemaDTO> {
  const res = await fetch("/api/admin/ajustes", {
    cache: "no-store",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al obtener los ajustes del sistema");
  }
  const result = await res.json();
  return result.data;
}

export async function updateAjustesAdmin(
  data: UpdateAjustesInput
): Promise<AjustesSistemaDTO> {
  const res = await fetch("/api/admin/ajustes", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al guardar los ajustes del sistema");
  }

  const result = await res.json();
  return result.data;
}

export async function getPoliticasPublicas(): Promise<PublicPoliticasResponse> {
  const res = await fetch("/api/public/politicas", {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error("Error al obtener políticas públicas");
  }
  return res.json();
}
