import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "@/shared/http/rate-limit";

const authPages = ["/login", "/register"];
const dashboardRoutes = ["/dashboard"];
const protectedApiRoutes = [
  "/api/admin",
  "/api/perfil",
  "/api/cart",
  "/api/productos",
  "/api/uploads",
  "/api/ventas",
  "/api/orders",
  "/api/fulfillment",
  "/api/pos",
  "/api/payments",
  "/api/mis-pedidos",
  "/api/inventario",
  "/api/reportes",
  "/api/usuarios",
];

const adminApiRoutes = ["/api/admin", "/api/reportes", "/api/usuarios", "/api/uploads"];
const staffApiRoutes = ["/api/productos", "/api/ventas", "/api/inventario"];

function getDashboardHomeByRole(role?: string) {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "VENDEDOR") return "/dashboard/vendedor";
  return "/";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { method } = request;
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  // --- RATE LIMITING ---
  let rlResult = { allowed: true };

  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/signup") || pathname === "/login" || pathname === "/register") {
    rlResult = checkRateLimit(`auth:${ip}`, RATE_LIMIT_CONFIGS.AUTH);
  } else if (pathname.startsWith("/api/productos/publicos")) {
    rlResult = checkRateLimit(`public:${ip}`, RATE_LIMIT_CONFIGS.PUBLIC);
  } else if (pathname.startsWith("/api/")) {
    // Para APIs protegidas, intentamos obtener el token primero para el ID de usuario
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.id as string | undefined;
    const key = userId ? `user:${userId}` : `ip:${ip}`;
    const config = method === "GET" ? RATE_LIMIT_CONFIGS.READ : RATE_LIMIT_CONFIGS.WRITE;
    rlResult = checkRateLimit(key, config);
  }

  if (!rlResult.allowed) {
    return NextResponse.json(
      { message: "Demasiadas solicitudes. Inténtalo más tarde." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
  // ----------------------

  const isPublicProductosRoute = pathname.startsWith("/api/productos/publicos");
  const isAuthPage = authPages.includes(pathname);
  const isDashboardRoute = dashboardRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isProtectedApiRoute = protectedApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/health") ||
    isPublicProductosRoute
  ) {
    return NextResponse.next();
  }

  if (!isAuthPage && !isDashboardRoute && !isProtectedApiRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const role = token?.rol as string | undefined;
  const userId = token?.id as string | undefined;

  if (isAuthPage && token) {
    return NextResponse.redirect(
      new URL(getDashboardHomeByRole(role), request.url)
    );
  }

  if (isAuthPage) {
    return NextResponse.next();
  }

  if (isDashboardRoute) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role === "CLIENTE") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (pathname === "/dashboard") {
      return NextResponse.redirect(
        new URL(getDashboardHomeByRole(role), request.url)
      );
    }

    if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(getDashboardHomeByRole(role), request.url)
      );
    }

    if (pathname.startsWith("/dashboard/vendedor") && role !== "VENDEDOR") {
      return NextResponse.redirect(
        new URL(getDashboardHomeByRole(role), request.url)
      );
    }

    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  if (!requestHeaders.get("x-request-id")) {
    requestHeaders.set("x-request-id", crypto.randomUUID());
  }
  // PREVENCIÓN DE SPOOFING: Limpiamos los headers internos por si alguien intenta inyectarlos desde afuera
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-role");

  if (!token) {
    // Si no hay sesión NextAuth, verificar si tiene token Bearer para APIs
    const authHeader = request.headers.get("authorization");
    if (pathname.startsWith("/api/") && authHeader?.startsWith("Bearer ")) {
      // Permitimos el paso; la ruta en sí usará `resolveApiAuth`
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    return NextResponse.json(
      { message: "No autenticado. Por favor inicia sesion." },
      { status: 401 }
    );
  }

  if (
    adminApiRoutes.some((route) => pathname.startsWith(route)) &&
    role !== "ADMIN"
  ) {
    return NextResponse.json(
      { message: "Acceso solo para ADMIN" },
      { status: 403 }
    );
  }

  if (
    staffApiRoutes.some((route) => pathname.startsWith(route)) &&
    !["ADMIN", "VENDEDOR"].includes(role || "")
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

  if (pathname.startsWith("/api/orders")) {
    const isStaff = ["ADMIN", "VENDEDOR"].includes(role || "");
    const isClientRead = role === "CLIENTE" && method === "GET";
    const isClientCheckout =
      role === "CLIENTE" &&
      method === "POST" &&
      pathname.startsWith("/api/orders/checkout");

    if (!isStaff && !isClientRead && !isClientCheckout) {
      return NextResponse.json(
        { message: "Acceso no autorizado" },
        { status: 403 }
      );
    }
  }

  if (pathname.startsWith("/api/fulfillment")) {
    const isStaff = ["ADMIN", "VENDEDOR"].includes(role || "");
    const isClientRead = role === "CLIENTE" && method === "GET";

    if (!isStaff && !isClientRead) {
      return NextResponse.json(
        { message: "Acceso no autorizado" },
        { status: 403 }
      );
    }
  }

  if (pathname.startsWith("/api/pos")) {
    const isStaff = ["ADMIN", "VENDEDOR"].includes(role || "");

    if (!isStaff) {
      return NextResponse.json(
        { message: "Acceso no autorizado" },
        { status: 403 }
      );
    }
  }

  if (pathname.startsWith("/api/cart") && role !== "CLIENTE") {
    return NextResponse.json(
      { message: "Acceso no autorizado" },
      { status: 403 }
    );
  }

  if (pathname.startsWith("/api/payments")) {
    const isStaff = ["ADMIN", "VENDEDOR"].includes(role || "");
    const isClient = role === "CLIENTE";

    if (!isStaff && !isClient) {
      return NextResponse.json(
        { message: "Acceso no autorizado" },
        { status: 403 }
      );
    }

    if (pathname.includes("/refund") && !isStaff) {
      return NextResponse.json(
        { message: "Acceso no autorizado" },
        { status: 403 }
      );
    }
  }

  // Si llegamos hasta aquí, hay un token válido de NextAuth.
  // Inyectamos la información del usuario en los headers (Fallback para APIs)
  if (userId) {
    requestHeaders.set("x-user-id", userId);
  }
  if (role) {
    requestHeaders.set("x-user-role", role);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/login", "/register"],
};
