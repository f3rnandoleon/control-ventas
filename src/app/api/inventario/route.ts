
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Inventario from "@/models/inventario";
import Producto from "@/models/product";
import type { Variante } from "@/types/producto";

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
    const role = headersList.get("x-user-role");
    const userIdRaw = headersList.get("x-user-id");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede ajustar inventario" },
        { status: 403 }
      );
    }

    if (!userIdRaw || !mongoose.Types.ObjectId.isValid(userIdRaw)) {
      return NextResponse.json(
        { message: "Usuario no autenticado" },
        { status: 401 }
      );
    }

    const userId = new mongoose.Types.ObjectId(userIdRaw);

    const { productoId, color, talla, cantidad, tipo, motivo } =
      await request.json();

    if (!mongoose.Types.ObjectId.isValid(productoId)) {
      return NextResponse.json(
        { message: "ID de producto inválido" },
        { status: 400 }
      );
    }

    const qty = Number(cantidad);
    if (!qty || qty <= 0) {
      return NextResponse.json(
        { message: "Cantidad inválida" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1️⃣ Leer producto
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // 2️⃣ Leer variante real
    const variante = (producto.variantes as Variante[]).find(
      (v) => v.color === color && v.talla === talla
    );


    if (!variante) {
      return NextResponse.json(
        { message: "Variante no encontrada" },
        { status: 404 }
      );
    }

    // 3️⃣ Stock anterior real
    const stockAnterior = variante.stock;

    // 4️⃣ Aplicar movimiento
    let stockActual = stockAnterior;

    if (tipo === "ENTRADA") {
      stockActual += qty;
    } else if (tipo === "SALIDA") {
      if (stockAnterior < qty) {
        return NextResponse.json(
          { message: "Stock insuficiente para salida" },
          { status: 400 }
        );
      }
      stockActual -= qty;
    } else if (tipo === "AJUSTE") {
      stockActual = qty;
    } else {
      return NextResponse.json(
        { message: "Tipo de movimiento inválido" },
        { status: 400 }
      );
    }

    // 5️⃣ Guardar producto (CLAVE)
    variante.stock = stockActual;
    await producto.save();

    // 6️⃣ Crear movimiento (MISMO QUE VENTAS)
    const movimiento = await Inventario.create({
      productoId: producto._id,
      variante: { color, talla },
      tipo,
      cantidad: qty,
      stockAnterior,
      stockActual,
      motivo,
      referencia: "AJUSTE_MANUAL",
      usuario: userId,
    });

    return NextResponse.json(
      { message: "Inventario actualizado correctamente", movimiento },
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