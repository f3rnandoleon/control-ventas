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
            anio: { $year: "$createdAt" },
            mes: { $month: "$createdAt" },
          },
          totalVentas: { $sum: "$total" },
          ganancia: { $sum: "$gananciaTotal" },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { "_id.anio": 1, "_id.mes": 1 } },
    ]);

    return NextResponse.json(ventas);
  } catch (error) {
    return NextResponse.json(
      { message: "Error en reporte mensual" },
      { status: 500 }
    );
  }
}
