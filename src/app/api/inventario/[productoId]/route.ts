import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Inventario from "@/models/inventario";

export async function GET(
  request: Request,
  { params }: { params: { productoId: string } }
) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.productoId)) {
      return NextResponse.json(
        { message: "ID de producto inválido" },
        { status: 400 }
      );
    }

    await connectDB();

    const movimientos = await Inventario.find({
      productoId: params.productoId,
    })
      .populate("usuario", "fullname")
      .sort({ createdAt: -1 });

    return NextResponse.json(movimientos);
  } catch (error) {
    return NextResponse.json(
      { message: "Error al obtener kardex" },
      { status: 500 }
    );
  }
}
