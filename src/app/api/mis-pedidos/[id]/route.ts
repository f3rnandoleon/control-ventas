import { NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";

type PedidoItemCliente = Record<string, unknown> & {
  precioCosto?: number;
  ganancia?: number;
};

type PedidoCliente = Record<string, unknown> & {
  gananciaTotal?: number;
  items: PedidoItemCliente[];
};

function sanitizeVentaForCliente(venta: PedidoCliente) {
  const itemsPublicos = venta.items.map((item) => {
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

export async function GET(request: Request, context: Context) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const role = headersList.get("x-user-role");
    const { id } = await context.params;

    if (!userId || role !== "CLIENTE") {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

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
      sanitizeVentaForCliente(venta as PedidoCliente)
    );
  } catch (error) {
    console.error("GET mis-pedidos/:id error:", error);
    return NextResponse.json(
      { message: "Error al obtener pedido" },
      { status: 500 }
    );
  }
}
