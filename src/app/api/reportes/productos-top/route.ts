import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";

export async function GET() {
  try {
    await connectDB();

    const productos = await Venta.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productoId",
          cantidadVendida: { $sum: "$items.cantidad" },
          totalVendido: {
            $sum: {
              $multiply: [
                "$items.cantidad",
                "$items.precioUnitario",
              ],
            },
          },
          ganancia: { $sum: "$items.ganancia" },
        },
      },
      { $sort: { cantidadVendida: -1 } },
      { $limit: 10 },
    ]);

    return NextResponse.json(productos);
  } catch (err) {
    console.error("ERROR:", err);
    return NextResponse.json(
      { message: "Error en reporte de productos" },
      { status: 500 }
    );
  }
}
