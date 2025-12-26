import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";
import { Variante } from "@/types/producto";

export async function GET(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {

  try {
    await connectDB();

    const { code } = await context.params;

    if (!code) {
      return NextResponse.json(
        { message: "Código no proporcionado" },
        { status: 400 }
      );
    }

    // 👇 SIN lean()
    const producto = await Producto.findOne({
      $or: [
        { "variantes.codigoBarra": code },
        { "variantes.qrCode": code },
      ],
    });

    if (!producto) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Ahora TS sí reconoce variantes
    const variante = producto.variantes.find(
    (v: Variante) => v.codigoBarra === code || v.qrCode === code
    );


    if (!variante) {
      return NextResponse.json(
        { message: "Variante no encontrada" },
        { status: 404 }
      );
    }

    if (variante.stock <= 0) {
      return NextResponse.json(
        { message: "Stock insuficiente" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      _id: producto._id,
      nombre: producto.nombre,
      modelo: producto.modelo,
      precioVenta: producto.precioVenta,
      variante: {
        color: variante.color,
        talla: variante.talla,
        stock: variante.stock,
        codigoBarra: variante.codigoBarra,
        qrCode: variante.qrCode,
      },
    });
  } catch (error) {
    console.error("ERROR GET PRODUCTO BY CODE:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
