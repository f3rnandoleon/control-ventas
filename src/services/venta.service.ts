import { CreateVentaDTO, Venta } from "@/types/venta";

export async function createVenta(data: CreateVentaDTO) {
  const res = await fetch("/api/ventas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al registrar venta");
  }

  return res.json();
}

export async function getVentas(): Promise<Venta[]> {
  const res = await fetch("/api/ventas");

  if (!res.ok) throw new Error("Error al obtener ventas");
  return res.json();
}
