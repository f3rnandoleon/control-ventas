import { NextResponse } from "next/server";
import mongoose from "mongoose";
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

type Context = {
  params: Promise<{ id: string }>;
};

import { resolveApiAuth } from "@/libs/resolveApiAuth";

export async function GET(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);
    const { id } = await context.params;

    if (!userAuth || userAuth.role !== "CLIENTE") {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    const userId = userAuth.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "ID de pedido inválido" },
        { status: 400 }
      );
    }

    await connectDB();
    const venta = await Venta.findOne({ _id: id, cliente: userId })
      .populate("items.productoId", "nombre modelo sku precioVenta")
      .lean();

    if (!venta) {
      return NextResponse.json(
        { message: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      sanitizeVentaForCliente(venta as Record<string, unknown>)
    );
  } catch (error) {
    console.error("GET mis-pedidos/:id error:", error);
    return NextResponse.json(
      { message: "Error al obtener pedido" },
      { status: 500 }
    );
  }
}
