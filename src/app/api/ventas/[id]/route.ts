import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const venta = await Venta.findById(id)
      .populate("vendedor", "fullname email");

    if (!venta) {
      return NextResponse.json(
        { message: "Venta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(venta);
  } catch (err) {
    console.error("ERROR:", err);
    return NextResponse.json(
      { message: "Error al obtener venta" },
      { status: 500 }
    );
  }
}
