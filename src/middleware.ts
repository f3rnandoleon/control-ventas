import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = [
  "/api/productos",
  "/api/ventas",
  "/api/mis-pedidos",
  "/api/inventario",
  "/api/reportes",
  "/api/usuarios",
];

const adminRoutes = ["/api/reportes", "/api/usuarios"];
const staffRoutes = ["/api/productos", "/api/ventas", "/api/inventario"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { method } = request;

  const isPublicProductosRoute = pathname.startsWith("/api/productos/publicos");

  // Permitir rutas de autenticación de NextAuth
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/auth/signup") ||
    isPublicProductosRoute
  ) {
    return NextResponse.next();
  }

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) return NextResponse.next();

  // 🔐 Obtener token de NextAuth desde cookies httpOnly
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json(
      { message: "No autenticado. Por favor inicia sesión." },
      { status: 401 }
    );
  }

  const role = token.role as string;
  const userId = token.id as string;

  // 🧑‍💼 Verificar permisos por rol
  if (
    adminRoutes.some((route) => pathname.startsWith(route)) &&
    role !== "ADMIN"
  ) {
    return NextResponse.json(
      { message: "Acceso solo para ADMIN" },
      { status: 403 }
    );
  }

  if (
    staffRoutes.some((route) => pathname.startsWith(route)) &&
    !["ADMIN", "VENDEDOR"].includes(role)
  ) {
    if (pathname.startsWith("/api/ventas") && role === "CLIENTE" && method === "POST") {
      // Permitir que CLIENTE registre ventas WEB en /api/ventas
    } else {
      return NextResponse.json(
        { message: "Acceso no autorizado" },
        { status: 403 }
      );
    }
  }

  if (pathname.startsWith("/api/mis-pedidos") && role !== "CLIENTE") {
    return NextResponse.json(
      { message: "Acceso no autorizado" },
      { status: 403 }
    );
  }

  // 🔄 Pasar datos del usuario a los API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", userId);
  requestHeaders.set("x-user-role", role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
