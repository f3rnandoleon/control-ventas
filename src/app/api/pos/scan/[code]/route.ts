import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import { scanVariantForPos } from "@/modules/pos/application/pos.service";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { code } = await context.params;
    const url = new URL(request.url);
    let sucursalId = url.searchParams.get("sucursalId");

    if (!sucursalId && auth.userAuth.id) {
      await connectDB();
      const user = await User.findById(auth.userAuth.id).select("sucursalAsignadaId");
      if (user?.sucursalAsignadaId) {
        sucursalId = user.sucursalAsignadaId.toString();
      }
    }

    const result = await scanVariantForPos(code, sucursalId || undefined);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al escanear producto",
      logLabel: "GET pos/scan error:",
    });
  }
}
