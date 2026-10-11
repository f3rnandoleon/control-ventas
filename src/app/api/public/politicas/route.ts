import { NextResponse } from "next/server";
import { getPoliticasPublicas } from "@/modules/ajustes/application/ajustes.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getPoliticasPublicas();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching public policies:", error);
    return NextResponse.json(
      { message: "Error al obtener las políticas públicas" },
      { status: 500 }
    );
  }
}
