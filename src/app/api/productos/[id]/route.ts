import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";
import mongoose from "mongoose";
import Inventario from "@/models/inventario";
import { generarSKU } from "@/utils/generarSKU";
import { generarCodigoVariante } from "@/utils/generarCodigoVariante";

type Context = {
  params: Promise<{ id: string }>;
};
export async function GET(
  request: Request,
  context: Context
) {
  try {
    const { id } = await context.params;

    await connectDB();
    const producto = await Producto.findById(id);

    if (!producto) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    return NextResponse.json(
      { message: "Error al obtener producto" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    const userIdRaw = headersList.get("x-user-id");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede actualizar productos" },
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
    const data = await request.json();

    await connectDB();

    // 1️⃣ Producto ANTES
    const productoAntes = await Producto.findById(id);
    if (!productoAntes) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    let nuevoSKU = productoAntes.sku;

    // 🔄 Regenerar SKU solo si cambia nombre o modelo
    if (
      (data.nombre && data.nombre !== productoAntes.nombre) ||
      (data.modelo && data.modelo !== productoAntes.modelo)
    ) {
      const nombreFinal = data.nombre || productoAntes.nombre;
      const modeloFinal = data.modelo || productoAntes.modelo;

      nuevoSKU = generarSKU(nombreFinal, modeloFinal);

      const existe = await Producto.findOne({
        sku: nuevoSKU,
        _id: { $ne: id },
      });

      if (existe) {
        return NextResponse.json(
          { message: "Ya existe un producto con ese SKU" },
          { status: 409 }
        );
      }
    }
    let variantesProcesadas = data.variantes;

    if (Array.isArray(data.variantes)) {
      variantesProcesadas = data.variantes.map((v: any) => {
        // Si ya tiene códigos, no tocar
        if (v.codigoBarra && v.qrCode) return v;

        // Contar cuántas variantes iguales existen
        const existentes = productoAntes.variantes.filter(
          (va: any) =>
            va.color === v.color && va.talla === v.talla
        );

        const correlativo = existentes.length + 1;

        const { codigoBarra, qrCode } = generarCodigoVariante({
          sku: nuevoSKU,
          color: v.color,
          talla: v.talla,
          correlativo,
        });

        return {
          ...v,
          codigoBarra,
          qrCode,
        };
      });
    }

    // 2️⃣ Actualizar producto
    const productoDespues = await Producto.findByIdAndUpdate(
      id,
      {
        ...data,
        sku: nuevoSKU,
        variantes: variantesProcesadas,
      },
      { new: true }
    );



    if (!productoDespues) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // 3️⃣ Comparar variantes (MISMO PATRÓN QUE VENTAS)
    for (const vNueva of productoDespues.variantes) {
      const vAnterior = productoAntes.variantes.find(
        (v: any) =>
          v.color === vNueva.color && v.talla === vNueva.talla
      );

      // 🟢 Variante NUEVA → ENTRADA
      if (!vAnterior && vNueva.stock > 0) {
        await Inventario.create({
          productoId: productoDespues._id,
          variante: {
            color: vNueva.color,
            talla: vNueva.talla,
          },
          tipo: "ENTRADA",
          cantidad: vNueva.stock,
          stockAnterior: 0,
          stockActual: vNueva.stock,
          motivo: "Nueva variante",
          referencia: "VARIANTE_NUEVA",
          usuario: userId,
        });
      }

      // 🟡 Variante existente → AUMENTO DE STOCK
      if (vAnterior && vNueva.stock > vAnterior.stock) {
        const diff = vNueva.stock - vAnterior.stock;

        await Inventario.create({
          productoId: productoDespues._id,
          variante: {
            color: vNueva.color,
            talla: vNueva.talla,
          },
          tipo: "ENTRADA",
          cantidad: diff,
          stockAnterior: vAnterior.stock,
          stockActual: vNueva.stock,
          motivo: "Aumento de stock",
          referencia: "ACTUALIZACION_VARIANTE",
          usuario: userId,
        });
      }
    }
    
    return NextResponse.json({
      message: "Producto actualizado correctamente",
      producto: productoDespues,
    });
  } catch (error) {
    console.error("PUT productos error:", error);
    return NextResponse.json(
      { message: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: Context
) {
  try {
    const { id } = await context.params;
    const headersList = await headers();
    const role = headersList.get("x-user-role");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede eliminar productos" },
        { status: 403 }
      );
    }

    await connectDB();

    const producto = await Producto.findByIdAndDelete(id);

    if (!producto) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Producto eliminado correctamente" }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
