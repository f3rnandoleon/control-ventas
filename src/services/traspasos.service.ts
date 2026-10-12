import type { Traspaso } from "@/types/traspaso";

export async function getTraspasos(): Promise<Traspaso[]> {
  const res = await fetch("/api/admin/traspasos", {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al obtener traspasos");
  }
  return res.json();
}

export async function getTraspasoById(id: string): Promise<Traspaso> {
  const res = await fetch(`/api/admin/traspasos/${id}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al obtener traspaso");
  }
  return res.json();
}

export async function crearTraspaso(data: {
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  items: Array<{
    productoId: string;
    varianteId: string;
    cantidadEnviada: number;
  }>;
  motivo?: string;
  notasEnvio?: string;
}): Promise<Traspaso> {
  const res = await fetch("/api/admin/traspasos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al crear traspaso");
  }
  return res.json();
}

export async function despacharTraspaso(id: string): Promise<Traspaso> {
  const res = await fetch(`/api/admin/traspasos/${id}/despachar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al despachar traspaso");
  }
  return res.json();
}

export async function recibirTraspaso(
  id: string,
  data?: {
    itemsRecibidos?: Array<{
      varianteId: string;
      cantidadRecibida: number;
    }>;
    notasRecepcion?: string;
  }
): Promise<Traspaso> {
  const res = await fetch(`/api/admin/traspasos/${id}/recibir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al recibir traspaso");
  }
  return res.json();
}

export async function cancelarTraspaso(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/admin/traspasos/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al cancelar traspaso");
  }
  return res.json();
}
