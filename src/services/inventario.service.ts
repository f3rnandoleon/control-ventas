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
