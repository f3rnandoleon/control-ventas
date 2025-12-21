import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = [
  "/api/productos",
  "/api/ventas",
  "/api/inventario",
  "/api/reportes",
  "/api/usuarios",
];

const adminRoutes = ["/api/reportes","/api/usuarios",];
const staffRoutes = [
  "/api/productos",
  "/api/ventas",
  "/api/inventario",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup")
  ) {
    return NextResponse.next();
  }

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) return NextResponse.next();

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { message: "Token no proporcionado" },
      { status: 401 }
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET no definido");
    }

    // 🔐 Verificar JWT (EDGE compatible)
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const role = payload.role as string;
    const userId = payload.id as string;

    // 🧑‍💼 Roles
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
      return NextResponse.json(
        { message: "Acceso no autorizado" },
        { status: 403 }
      );
    }

    // 🔄 Pasar datos al backend
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-role", role);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (error) {
    console.error("JWT ERROR:", error);
    return NextResponse.json(
      { message: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
