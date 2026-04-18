import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { scanVariantForPos } from "@/modules/pos/application/pos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const { code } = await context.params;
    const result = await scanVariantForPos(code);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al escanear producto",
      logLabel: "GET pos/scan error:",
    });
  }
}
