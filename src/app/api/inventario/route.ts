
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Inventario from "@/models/inventario";
import Producto from "@/models/product";

export async function GET() {
  try {
    await connectDB();

    const movimientos = await Inventario.find()
      .populate("productoId", "nombre modelo")
      .populate("usuario", "fullname email")
      .sort({ createdAt: -1 });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error("INVENTARIO GET ERROR:", error);
    return NextResponse.json(
      { message: "Error al obtener inventario" },
      { status: 500 }
    );
  }
}
export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const role = headersList.get("x-user-role");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede ajustar inventario" },
        { status: 403 }
      );
    }

    const { productoId, color, talla, cantidad, tipo, motivo } =
      await request.json();

    if (!mongoose.Types.ObjectId.isValid(productoId)) {
      return NextResponse.json(
        { message: "ID de producto inválido" },
        { status: 400 }
      );
    }

    await connectDB();

    const producto = await Producto.findById(productoId);
    if (!producto) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const variante = producto.variantes.find(
      (v: any) => v.color === color && v.talla === talla
    );

    if (!variante) {
      return NextResponse.json(
        { message: "Variante no encontrada" },
        { status: 404 }
      );
    }

    const stockAnterior = variante.stock;

    // 🔄 Aplicar ajuste
    if (tipo === "ENTRADA") {
      variante.stock += cantidad;
    } else if (tipo === "SALIDA") {
      if (variante.stock < cantidad) {
        return NextResponse.json(
          { message: "Stock insuficiente para salida" },
          { status: 400 }
        );
      }
      variante.stock -= cantidad;
    } else if (tipo === "AJUSTE") {
      variante.stock = cantidad;
    }

    const stockActual = variante.stock;

    await producto.save();

    // 🧾 Registrar movimiento
    const movimiento = await Inventario.create({
      productoId,
      variante: { color, talla },
      tipo,
      cantidad,
      stockAnterior,
      stockActual,
      motivo,
      referencia: "AJUSTE_MANUAL",
      usuario: userId,
    });

    return NextResponse.json(
      { message: "Inventario actualizado", movimiento },
      { status: 201 }
    );
  } catch (error) {
    console.error("INVENTARIO POST ERROR:", error);
    return NextResponse.json(
      { message: "Error al ajustar inventario" },
      { status: 500 }
    );
  }
}
