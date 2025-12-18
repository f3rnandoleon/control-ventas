import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";
import "@/models/user"; 

import Producto from "@/models/product";
import Inventario from "@/models/inventario";
import mongoose from "mongoose";
export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const role = headersList.get("x-user-role");

    if (!userId || !["ADMIN", "VENDEDOR"].includes(role || "")) {
      return NextResponse.json(
        { message: "No autorizado para realizar ventas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items, metodoPago, tipoVenta, descuento = 0, impuesto = 0 } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: "La venta debe tener al menos un producto" },
        { status: 400 }
      );
    }

    await connectDB();

    let subtotal = 0;
    let gananciaTotal = 0;

    // 🔹 Validar productos y calcular totales
    for (const item of items) {
        if (!mongoose.Types.ObjectId.isValid(item.productoId)) {
        return NextResponse.json(
            { message: "ID de producto inválido" },
            { status: 400 }
        );
        }
      const producto = await Producto.findById(item.productoId);
      if (!producto) {
        return NextResponse.json(
          { message: "Producto no encontrado" },
          { status: 404 }
        );
      }

      const variante = producto.variantes.find(
        (v: any) =>
          v.color === item.color && v.talla === item.talla
      );

      if (!variante) {
        return NextResponse.json(
          { message: "Variante no encontrada" },
          { status: 404 }
        );
      }

      if (variante.stock < item.cantidad) {
        return NextResponse.json(
          { message: `Stock insuficiente (${producto.nombre})` },
          { status: 400 }
        );
      }

      const precioUnitario = producto.precioVenta;
      const precioCosto = producto.precioCosto;

      subtotal += precioUnitario * item.cantidad;
      gananciaTotal +=
        (precioUnitario - precioCosto) * item.cantidad;

      // 🔻 Descontar stock
      const stockAnterior = variante.stock;
      variante.stock -= item.cantidad;

      // 🔄 Registrar movimiento de stock
      await Inventario.create({
        productoId: producto._id,
        variante: {
          color: item.color,
          talla: item.talla,
        },
        tipo: "SALIDA",
        cantidad: item.cantidad,
        stockAnterior,
        stockActual: variante.stock,
        motivo: "Venta",
        referencia: "VENTA",
        usuario: userId,
      });

      producto.totalVendidos += item.cantidad;
      await producto.save();

      // Guardar datos calculados en el item
        item.variante = {
        color: item.color,
        talla: item.talla,
        };

        item.precioUnitario = precioUnitario;
        item.precioCosto = precioCosto;
        item.ganancia =
        (precioUnitario - precioCosto) * item.cantidad;

        // Limpieza opcional (recomendado)
        delete item.color;
        delete item.talla;
    }

    const total = subtotal - descuento + impuesto;

    // 🔢 Número de venta simple (mejorable luego)
    const numeroVenta = `V-${Date.now()}`;

    const venta = await Venta.create({
      numeroVenta,
      items,
      subtotal,
      descuento,
      impuesto,
      total,
      gananciaTotal,
      metodoPago,
      tipoVenta,
      vendedor: userId,
      estado: "PAGADA",
    });

    return NextResponse.json(
      { message: "Venta registrada correctamente", venta },
      { status: 201 }
    );
  } catch (error) {
    console.error("VENTA ERROR:", error);
    return NextResponse.json(
      { message: "Error al registrar la venta" },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.log(Object.keys(mongoose.models));
  try {
    await connectDB();
    const ventas = await Venta.find()
      .populate("vendedor", "fullname email")
      .sort({ createdAt: -1 });

    return NextResponse.json(ventas);
  } catch (error) {
    return NextResponse.json(
      { message: "Error al obtener ventas" },
      { status: 500 }
    );
  }
}
