import { Producto } from "@/types/producto";

export async function getProductos(): Promise<Producto[]> {
  const res = await fetch("/api/productos");
  if (!res.ok) throw new Error("Error al obtener productos");
  return res.json();
}

export async function createProducto(data: Partial<Producto>) {
  const res = await fetch("/api/productos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear producto");
  return res.json();
}

export async function updateProducto(id: string, data: Partial<Producto>) {
  const res = await fetch(`/api/productos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar producto");
  return res.json();
}

export async function deleteProducto(id: string) {
  const res = await fetch(`/api/productos/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar producto");
}
