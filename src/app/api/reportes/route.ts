import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";

export async function GET() {
  try {
    await connectDB();

    const [resumen] = await Venta.aggregate([
      {
        $group: {
          _id: null,
          totalVentas: { $sum: "$total" },
          gananciaTotal: { $sum: "$gananciaTotal" },
          cantidadVentas: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json(
      resumen || {
        totalVentas: 0,
        gananciaTotal: 0,
        cantidadVentas: 0,
      }
    );
  } catch (error) {
    console.error("REPORTE GENERAL ERROR:", error);
    return NextResponse.json(
      { message: "Error al generar reporte" },
      { status: 500 }
    );
  }
}
