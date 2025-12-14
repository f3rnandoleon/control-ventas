import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// Rutas que requieren autenticación
const protectedRoutes = [
  "/api/productos",
  "/api/ventas",
  "/api/inventario",
  "/api/reportes",
];

// Rutas solo para ADMIN
const adminRoutes = [
  "/api/reportes",
];

// Rutas solo para ADMIN y VENDEDOR
const staffRoutes = [
  "/api/productos",
  "/api/ventas",
  "/api/inventario",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ⛔ Ignorar rutas públicas
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup")
  ) {
    return NextResponse.next();
  }

  // 🔍 Verificar si es ruta protegida
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // 🔐 Obtener token del header Authorization
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { message: "Token no proporcionado" },
      { status: 401 }
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET no definido");
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    // 🧑‍💼 Control de roles
    if (
      adminRoutes.some((route) => pathname.startsWith(route)) &&
      decoded.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { message: "Acceso solo para administradores" },
        { status: 403 }
      );
    }

    if (
      staffRoutes.some((route) => pathname.startsWith(route)) &&
      !["ADMIN", "VENDEDOR"].includes(decoded.role)
    ) {
      return NextResponse.json(
        { message: "Acceso no autorizado" },
        { status: 403 }
      );
    }

    // 🔄 Adjuntar datos del usuario a la request (headers)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", decoded.id);
    requestHeaders.set("x-user-role", decoded.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
