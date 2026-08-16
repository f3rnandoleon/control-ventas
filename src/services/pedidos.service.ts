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
  const res = await fetch("/api/pedidos?scope=sales");

  if (!res.ok) throw new Error("Error al obtener ventas");
  return res.json();
}

export async function getMisVentas(): Promise<Pedido[]> {
  const res = await fetch("/api/pos/my-sales");

  if (!res.ok) throw new Error("Error al obtener tus ventas");
  return res.json();
}

export type SalesFilters = {
  page: number; limit: number; from?: string; to?: string;
  customer?: string; seller?: string; paymentMethod?: "EFECTIVO" | "QR";
};

export type PaginatedSalesResponse = {
  items: Pedido[]; page: number; limit: number; total: number; totalPages: number;
};

export async function getVentasPage(filters: SalesFilters, signal?: AbortSignal): Promise<PaginatedSalesResponse> {
  const params = new URLSearchParams({ scope: "sales", page: String(filters.page), limit: String(filters.limit) });
  Object.entries(filters).forEach(([key, value]) => {
    if (!["page", "limit"].includes(key) && value) params.set(key, String(value));
  });
  const res = await fetch(`/api/pedidos?${params.toString()}`, { signal });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || "Error al obtener ventas");
  }
  return res.json();
}
