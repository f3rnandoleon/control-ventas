import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rejectPaymentByToken } from "@/modules/payments/application/payments.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { z } from "zod";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

const rejectSchema = z.object({
  reason: z.string().trim().max(250).optional(),
});

async function resolveStaffFromSession(request: NextRequest) {
  const authToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const role = authToken?.rol as "ADMIN" | "VENDEDOR" | "CLIENTE" | undefined;
  const id = authToken?.id as string | undefined;

  if (!id || !role) return null;
  if (!["ADMIN", "VENDEDOR"].includes(role)) return null;

  return { id, rol: role };
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const userAuth = await resolveStaffFromSession(request);
    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const { token } = await context.params;

    let reason: string | undefined;
    try {
      const body = await request.json();
      const parsed = rejectSchema.safeParse(body);
      if (parsed.success) reason = parsed.data.reason;
    } catch {
      // Empty body is allowed.
    }

    const result = await rejectPaymentByToken(userAuth, token, reason);

    return NextResponse.json(
      {
        message: "Pago rechazado. El pedido fue cancelado y el stock liberado.",
        pedido: {
          _id: result.pedido._id,
          numeroPedido: result.pedido.numeroPedido,
          estadoPedido: result.pedido.estadoPedido,
          estadoPago: result.pedido.estadoPago,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al rechazar el pago",
      logLabel: "POST verificar/pago/reject error:",
    });
  }
}
