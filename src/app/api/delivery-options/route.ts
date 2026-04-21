import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "delivery-options.json");
    const data = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("Error reading delivery options:", error);
    return NextResponse.json(
      { message: "Error al obtener las opciones de entrega" },
      { status: 500 }
    );
  }
}
