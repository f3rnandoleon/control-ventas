import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";

function sanitizeVentaForCliente(venta: Record<string, unknown>) {
  const items = Array.isArray(venta.items)
    ? (venta.items as Record<string, unknown>[])
    : [];

  const itemsPublicos = items.map((item) => {
    const itemPublico = { ...item };
    delete itemPublico.precioCosto;
    delete itemPublico.ganancia;
    return itemPublico;
  });

  const pedidoPublico: Record<string, unknown> = {
    ...venta,
    items: itemsPublicos,
  };

  delete pedidoPublico.gananciaTotal;
  return pedidoPublico;
}

export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const role = headersList.get("x-user-role");

    if (!userId || role !== "CLIENTE") {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    await connectDB();
    const ventas = await Venta.find({ cliente: userId })
      .populate("items.productoId", "nombre modelo sku precioVenta")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      (ventas as Record<string, unknown>[]).map(sanitizeVentaForCliente)
    );
  } catch (error) {
    console.error("GET mis-pedidos error:", error);
    return NextResponse.json(
      { message: "Error al obtener mis pedidos" },
      { status: 500 }
    );
  }
}
