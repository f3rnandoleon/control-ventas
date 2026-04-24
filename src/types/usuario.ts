import type { DireccionCliente, PerfilCliente } from "@/types/cliente";

export type UserRole = "ADMIN" | "VENDEDOR" | "CLIENTE";

export interface Usuario {
  _id: string;
  nombreCompleto: string;
  email: string;
  rol: UserRole;
  estaActivo: boolean;
  createdAt: string;
}

export interface PerfilUsuario extends Usuario {
  updatedAt: string;
  ultimoAcceso?: string;
  perfilCliente?: PerfilCliente | null;
  direccionPredeterminada?: DireccionCliente | null;
}

export type CreateUsuarioDTO = {
  nombreCompleto: string;
  email: string;
  rol: UserRole;
  estaActivo?: boolean;
  password: string;
};

export type UpdateUsuarioDTO = {
  nombreCompleto?: string;
  email?: string;
  rol?: UserRole;
  estaActivo?: boolean;
  password?: string;
};

export type UpdatePerfilDTO = {
  nombreCompleto: string;
  email: string;
  password?: string;
};
