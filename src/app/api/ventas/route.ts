import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { connectDB } from "@/libs/mongodb";
import Venta from "@/models/venta";
import "@/models/user";
import type { Variante } from "@/types/producto";
import Producto from "@/models/product";
import Inventario from "@/models/inventario";
import mongoose from "mongoose";
import { validateRequest, validationErrorResponse } from "@/middleware/validate.middleware";
import { createVentaSchema } from "@/schemas/venta.schema";

type VentaItemProcesado = {
  productoId: string;
  variante: {
    color: string;
    talla: string;
  };
  cantidad: number;
  precioUnitario: number;
  precioCosto: number;
  ganancia: number;
};

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    const userId = userAuth.id;
    const role = userAuth.role;

    if (!["ADMIN", "VENDEDOR", "CLIENTE"].includes(role)) {
      return NextResponse.json(
        { message: "No autorizado para realizar ventas" },
        { status: 403 }
      );
    }

    // Validar datos con Zod
    const validation = await validateRequest(createVentaSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { items, metodoPago, tipoVenta, descuento = 0, delivery } = validation.data;

    if (role === "CLIENTE" && tipoVenta !== "WEB") {
      return NextResponse.json(
        { message: "CLIENTE solo puede registrar ventas tipo WEB" },
        { status: 403 }
      );
    }

    const impuesto = 0; // Puedes agregar esto al schema si lo necesitas

    await connectDB();

    let subtotal = 0;
    let gananciaTotal = 0;
    const itemsProcesados: VentaItemProcesado[] = [];

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

      const variante = (producto.variantes as Variante[]).find(
        (v) =>
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

      itemsProcesados.push({
        productoId: item.productoId,
        variante: {
          color: item.color,
          talla: item.talla,
        },
        cantidad: item.cantidad,
        precioUnitario,
        precioCosto,
        ganancia: (precioUnitario - precioCosto) * item.cantidad,
      });
    }

    const total = subtotal - descuento + impuesto;

    // 🔢 Número de venta simple (mejorable luego)
    const numeroVenta = `V-${Date.now()}`;

    const ventaPayload: Record<string, unknown> = {
      numeroVenta,
      items: itemsProcesados,
      subtotal,
      descuento,
      impuesto,
      total,
      gananciaTotal,
      metodoPago,
      tipoVenta,
      estado: "PAGADA",
    };

    if (delivery) {
      ventaPayload.delivery = delivery;
    }

    if (role === "CLIENTE") {
      ventaPayload.cliente = userId;
    } else {
      ventaPayload.vendedor = userId;
    }

    const venta = await Venta.create(ventaPayload);

    return NextResponse.json(
      { 
        message: "Venta registrada correctamente",
        venta: {
          _id: venta._id,
          numeroVenta: venta.numeroVenta,
          estado: venta.estado,
          subtotal: venta.subtotal,
          descuento: venta.descuento,
          total: venta.total,
          metodoPago: venta.metodoPago,
          tipoVenta: venta.tipoVenta,
          createdAt: venta.createdAt,
          items: venta.items,
          delivery: venta.delivery
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("VENTA ERROR:", err);
    return NextResponse.json(
      { message: "Error al registrar la venta" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const ventas = await Venta.find()
      .populate("vendedor", "fullname email")
      .sort({ createdAt: -1 });

    return NextResponse.json(ventas);
  } catch (err) {
    console.error("ERROR:", err);
    return NextResponse.json(
      { message: "Error al obtener ventas" },
      { status: 500 }
    );
  }
}
