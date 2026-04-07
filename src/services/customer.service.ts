import type {
  CreateCustomerAddressDTO,
  CustomerAddress,
  CustomerMeResponse,
  UpdateCustomerAddressDTO,
  UpdateCustomerProfileDTO,
} from "@/types/customer";

export async function getCustomerMe(): Promise<CustomerMeResponse> {
  const res = await fetch("/api/customers/me");
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error al obtener perfil de cliente");
  }

  return data;
}

export async function updateCustomerMe(data: UpdateCustomerProfileDTO) {
  const res = await fetch("/api/customers/me", {
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

export async function listCustomerAddresses(): Promise<CustomerAddress[]> {
  const res = await fetch("/api/customers/me/addresses");
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error al obtener direcciones");
  }

  return data;
}

export async function createCustomerAddress(data: CreateCustomerAddressDTO) {
  const res = await fetch("/api/customers/me/addresses", {
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
  addressId: string,
  data: UpdateCustomerAddressDTO
) {
  const res = await fetch(`/api/customers/me/addresses/${addressId}`, {
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

export async function deleteCustomerAddress(addressId: string) {
  const res = await fetch(`/api/customers/me/addresses/${addressId}`, {
    method: "DELETE",
  });
  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.message || "Error al eliminar direccion");
  }

  return responseData;
}
