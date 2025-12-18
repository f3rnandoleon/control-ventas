import { Producto } from "@/types/producto";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export async function getProductos(): Promise<Producto[]> {
  const res = await fetch("/api/productos", {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("Error al obtener productos");
  return res.json();
}

export async function createProducto(data: Partial<Producto>) {
  const res = await fetch("/api/productos", {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear producto");
  return res.json();
}

export async function updateProducto(id: string, data: Partial<Producto>) {
  const res = await fetch(`/api/productos/${id}`, {
    method: "PUT",
    headers: authHeader(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar producto");
  return res.json();
}

export async function deleteProducto(id: string) {
  const res = await fetch(`/api/productos/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("Error al eliminar producto");
}
