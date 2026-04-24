import { CreatePedidoInput } from "@/schemas/pedido.schema";
import { Pedido } from "@/types/pedido";

export async function createVenta(data: CreatePedidoInput) {
  const res = await fetch("/api/pos/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      descuento: data.descuento ?? 0,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al registrar venta");
  }

  return res.json();
}

export async function getVentas(): Promise<Pedido[]> {
  const res = await fetch("/api/pedidos");

  if (!res.ok) throw new Error("Error al obtener ventas");
  return res.json();
}
