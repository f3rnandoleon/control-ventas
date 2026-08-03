import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPaymentByReviewToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { checkRateLimit } from "@/shared/http/rate-limit";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * GET /api/verificar/pago/:token
 * Ruta pública: no requiere autenticación.
 */
export async function GET(request: NextRequest, context: Context) {
  try {
    const { token } = await context.params;
    const rateLimit = checkRateLimit(
      `payment-review:${getClientIp(request)}:${token.slice(0, 16)}`,
      { windowMs: 60 * 1000, maxRequests: 20 }
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Demasiados intentos" },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
            ),
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
            "X-Robots-Tag": "noindex, nofollow",
          },
        }
      );
    }

    const authToken = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const role = authToken?.rol as string | undefined;
    const isStaff = ["ADMIN", "VENDEDOR"].includes(role || "");
    const reviewData = await getPaymentByReviewToken(token, {
      includeStaffDetails: isStaff,
    });

    return NextResponse.json({
      ...reviewData,
      permissions: {
        canResolve: isStaff,
        requiresLogin: !isStaff,
      },
    }, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Link de verificación inválido",
      logLabel: "GET verificar/pago error:",
    });
  }
}
