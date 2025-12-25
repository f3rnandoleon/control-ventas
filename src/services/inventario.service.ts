import type { ProductoInventario } from "@/types/inventario";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export async function getInventario() {
  const res = await fetch("/api/inventario", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Error al obtener inventario");
  }

  return res.json();
}

export async function getProductosInventario(): Promise<ProductoInventario[]> {
  const res = await fetch("/api/productos?withStock=true", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Error al obtener productos con stock");
  }

  return res.json();
}
