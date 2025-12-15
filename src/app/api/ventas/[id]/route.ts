import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const venta = await Venta.findById(params.id)
      .populate("vendedor", "fullname email");

    if (!venta) {
      return NextResponse.json(
        { message: "Venta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(venta);
  } catch (error) {
    return NextResponse.json(
      { message: "Error al obtener venta" },
      { status: 500 }
    );
  }
}
