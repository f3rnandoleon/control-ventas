import { NextResponse } from "next/server";
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

import { resolveApiAuth } from "@/libs/resolveApiAuth";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.role !== "CLIENTE") {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    const userId = userAuth.id;

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
