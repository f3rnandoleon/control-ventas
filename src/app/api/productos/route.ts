import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";

export async function GET() {
  try {
    await connectDB();
    const productos = await Producto.find().sort({ createdAt: -1 });
    return NextResponse.json(productos);
  } catch (error) {
    console.error("GET productos error:", error);
    return NextResponse.json(
      { message: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    const userId = headersList.get("x-user-id");


    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede crear productos" },
        { status: 403 }
      );
    }

    const data = await request.json();

    await connectDB();

    const producto = new Producto({
      ...data,
      creadoPor: userId,
    });

    await producto.save();

    return NextResponse.json(
      { message: "Producto creado correctamente", producto },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST productos error:", error);
    return NextResponse.json(
      { message: "Error al crear producto" },
      { status: 500 }
    );
  }
}
