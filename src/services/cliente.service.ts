import type {
  CrearDireccionClienteDTO,
  DireccionCliente,
  RespuestaClienteMe,
  ActualizarDireccionClienteDTO,
  ActualizarPerfilClienteDTO,
} from "@/types/cliente";

export async function getCustomerMe(): Promise<RespuestaClienteMe> {
  const res = await fetch("/api/clientes/me");
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error al obtener perfil de cliente");
  }

  return data;
}

export async function updateCustomerMe(data: ActualizarPerfilClienteDTO) {
  const res = await fetch("/api/clientes/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(
      responseData.message || "Error al actualizar perfil de cliente"
    );
  }

  return responseData;
}

export async function listCustomerAddresses(): Promise<DireccionCliente[]> {
  const res = await fetch("/api/clientes/me/direcciones");
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error al obtener direcciones");
  }

  return data;
}

export async function createCustomerAddress(data: CrearDireccionClienteDTO) {
  const res = await fetch("/api/clientes/me/direcciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.message || "Error al crear direccion");
  }

  return responseData;
}

export async function updateCustomerAddress(
  direccionId: string,
  data: ActualizarDireccionClienteDTO
) {
  const res = await fetch(`/api/clientes/me/direcciones/${direccionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.message || "Error al actualizar direccion");
  }

  return responseData;
}

export async function deleteCustomerAddress(direccionId: string) {
  const res = await fetch(`/api/clientes/me/direcciones/${direccionId}`, {
    method: "DELETE",
  });
  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.message || "Error al eliminar direccion");
  }

  return responseData;
}
