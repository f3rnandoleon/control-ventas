import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Banner from "@/models/banner";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { bannerSchema } from "@/schemas/banner.schema";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    await connectDB();
    const banners = await Banner.find().sort({ orden: 1, createdAt: -1 }).lean();

    return NextResponse.json(banners);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al listar banners",
      logLabel: "ADMIN BANNERS GET ERROR:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const parsed = bannerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos de banner inválidos",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    await connectDB();

    const bannerData = {
      ...parsed.data,
      fechaInicio: parsed.data.fechaInicio ? new Date(parsed.data.fechaInicio) : undefined,
      fechaFin: parsed.data.fechaFin ? new Date(parsed.data.fechaFin) : undefined,
    };

    const newBanner = await Banner.create(bannerData);

    return NextResponse.json(newBanner, { status: 201 });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear banner",
      logLabel: "ADMIN BANNERS POST ERROR:",
    });
  }
}

