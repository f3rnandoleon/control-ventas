import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";

const PUBLIC_PRODUCT_PROJECTION = {
  precioCosto: 0,
  creadoPor: 0,
  __v: 0,
  "variantes.codigoBarra": 0,
  "variantes.qrCode": 0,
} as const;

export async function GET() {
  try {
    await connectDB();
    const productos = await Producto.find(
      { estado: { $ne: "INACTIVO" } },
      PUBLIC_PRODUCT_PROJECTION
    ).sort({ createdAt: -1 });

    return NextResponse.json(productos);
  } catch (error) {
    console.error("GET productos/publicos error:", error);
    return NextResponse.json(
      { message: "Error al obtener catálogo público" },
      { status: 500 }
    );
  }
}
