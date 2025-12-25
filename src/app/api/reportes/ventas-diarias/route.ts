import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";

export async function GET() {
  try {
    await connectDB();

    const ventas = await Venta.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalVentas: { $sum: "$total" },
          ganancia: { $sum: "$gananciaTotal" },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json(ventas);
  } catch (err) {
    console.error("ERROR:", err);
    return NextResponse.json(
      { message: "Error en reporte diario" },
      { status: 500 }
    );
  }
}
