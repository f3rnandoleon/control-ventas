export type UserRole = "ADMIN" | "VENDEDOR" | "CLIENTE";

export interface Usuario {
  _id: string;
  fullname: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export type CreateUsuarioDTO = {
  fullname: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  password: string; // 🔴 OBLIGATORIO
};

export type UpdateUsuarioDTO = {
  fullname?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string; // 🟢 OPCIONAL
};

