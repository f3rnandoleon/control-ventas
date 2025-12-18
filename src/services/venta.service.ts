import { Venta } from "@/types/venta";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export async function createVenta(data: any) {
  const res = await fetch("/api/ventas", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al registrar venta");
  }

  return res.json();
}

export async function getVentas(): Promise<Venta[]> {
  const res = await fetch("/api/ventas", {
    headers: authHeaders(),
  });

  if (!res.ok) throw new Error("Error al obtener ventas");
  return res.json();
}
