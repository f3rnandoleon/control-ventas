export type UserRole = "ADMIN" | "VENDEDOR" | "CLIENTE";

export interface Usuario {
  _id: string;
  fullname: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface PerfilUsuario extends Usuario {
  updatedAt: string;
  lastLogin?: string;
}

export type CreateUsuarioDTO = {
  fullname: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  password: string;
};

export type UpdateUsuarioDTO = {
  fullname?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
};

export type UpdatePerfilDTO = {
  fullname: string;
  email: string;
  password?: string;
};
