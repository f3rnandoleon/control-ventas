import { DeliveryOptions } from "@/types/delivery";

export async function getDeliveryOptions(): Promise<DeliveryOptions> {
  const res = await fetch("/api/delivery-options", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al obtener opciones de entrega");
  return res.json();
}

export async function updateDeliveryOptions(data: DeliveryOptions): Promise<DeliveryOptions> {
  const res = await fetch("/api/admin/delivery-options", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Error al actualizar opciones de entrega");
  }
  
  const result = await res.json();
  return result.data;
}
