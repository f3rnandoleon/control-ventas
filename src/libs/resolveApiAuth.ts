import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/models/user";
import { connectDB } from "@/libs/mongodb";
export type AuthUser = {
  id: string;
  email?: string;
  fullname?: string;
  role: "ADMIN" | "VENDEDOR" | "CLIENTE";
};

/**
 * Resuelve la autenticación del usuario en rutas de API.
 * 
 * Estrategia híbrida:
 * 1. Prioriza `Authorization: Bearer <token>` (Terceros externos o web storefront).
 * 2. Cae en los headers inyectados por el Middleware (`x-user-id`, `x-user-role`), 
 *    los cuales están garantizados de venir de una sesión válida de NextAuth 
 *    porque el middleware sanea las peticiones entrantes.
 * 
 * @param request Objeto Request o NextRequest
 * @returns El usuario autenticado, o nulo si no hay autenticación válida.
 */
export async function resolveApiAuth(
  request: NextRequest | Request
): Promise<AuthUser | null> {
  // 1. Intentar resolver por Token Bearer
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error("JWT_SECRET no está definido en las variables de entorno");
        }
        // En Node.js (el runtime de App Router API Routes) `jsonwebtoken` funciona perfectamente.
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
        await connectDB();
        const dbUser = await User.findById(decoded.id).select("isActive");
        if (!dbUser || !dbUser.isActive) return null;
        if (decoded && decoded.id && decoded.role) {
          return {
            id: decoded.id,
            email: decoded.email,
            fullname: decoded.fullname,
            role: decoded.role as AuthUser["role"],
          };
        }
      } catch (err) {
        // Token inválido o expirado. Podríamos loguear o simplemente continuar al fallback.
        console.error("Failed to verify Bearer Token:", (err as Error).message);
      }
    }
  }

  // 2. Fallback a headers de NextAuth inyectados por el Middleware
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (userId && role) {
    return {
      id: userId,
      role: role as AuthUser["role"],
    };
  }

  return null;
}
