export type UserRole = "ADMIN" | "VENDEDOR" | "CLIENTE";

export interface Usuario {
  _id: string;
  fullname: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}
