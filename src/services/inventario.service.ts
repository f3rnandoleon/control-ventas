import type { ProductoInventario } from "@/types/inventario";

export async function getInventario() {
  const res = await fetch("/api/inventario");

  if (!res.ok) {
    throw new Error("Error al obtener inventario");
  }

  return res.json();
}

export async function getProductosInventario(): Promise<ProductoInventario[]> {
  const res = await fetch("/api/productos?withStock=true");

  if (!res.ok) {
    throw new Error("Error al obtener productos con stock");
  }

  return res.json();
}

export interface AjustarStockPayload {
  productoId: string;
  varianteId?: string;
  sucursalId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  motivo?: string;
  referencia?: string;
}

export async function ajustarStockInventario(payload: AjustarStockPayload) {
  const res = await fetch("/api/inventario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || "Error al realizar ajuste de stock");
  }

  return data;
}

