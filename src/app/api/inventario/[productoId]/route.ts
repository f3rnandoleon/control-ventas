import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Inventario from "@/models/inventario";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productoId: string }> }
) {
  try {
    const { productoId } = await params;

    if (!mongoose.Types.ObjectId.isValid(productoId)) {
      return NextResponse.json(
        { message: "ID de producto inválido" },
        { status: 400 }
      );
    }

    await connectDB();

    const movimientos = await Inventario.find({
      productoId,
    })
      .populate("usuario", "fullname")
      .sort({ createdAt: -1 });

    return NextResponse.json(movimientos);
  } catch (err) {
    console.error("GET inventario error:", err);
    return NextResponse.json(
      { message: "Error al obtener kardex" },
      { status: 500 }
    );
  }
}
