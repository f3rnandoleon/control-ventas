import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";

const PUBLIC_PRODUCT_PROJECTION = {
  precioCosto: 0,
  creadoPor: 0,
  __v: 0,
  "variantes.codigoBarra": 0,
  "variantes.qrCode": 0,
} as const;

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "ID de producto inválido" },
        { status: 400 }
      );
    }

    await connectDB();
    const producto = await Producto.findOne(
      { _id: id, estado: { $ne: "INACTIVO" } },
      PUBLIC_PRODUCT_PROJECTION
    );

    if (!producto) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error("GET productos/publicos/:id error:", error);
    return NextResponse.json(
      { message: "Error al obtener producto público" },
      { status: 500 }
    );
  }
}
