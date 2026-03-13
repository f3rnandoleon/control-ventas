import { NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";
import Inventario from "@/models/inventario";
import { generarSKU } from "@/utils/generarSKU";
import { generarCodigoVariante } from "@/utils/generarCodigoVariante";
import { updateProductoSchema } from "@/schemas/producto.schema";
import {
  cleanupRemovedVariantImages,
  normalizeVariantImages,
} from "@/libs/cloudinary";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import type { Variante } from "@/types/producto";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
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
  } catch (err) {
    console.error("ERROR:", err);
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

    const validation = await validateRequest(updateProductoSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const userId = new mongoose.Types.ObjectId(userIdRaw);
    const data = validation.data;

    await connectDB();

    const productoAntes = await Producto.findById(id);
    if (!productoAntes) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    let nuevoSKU = productoAntes.sku;

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
      const variantesNormalizadas = await normalizeVariantImages(
        data.variantes as Variante[]
      );

      variantesProcesadas = variantesNormalizadas.map((variante) => {
        if (variante.codigoBarra && variante.qrCode) {
          return variante;
        }

        const existentes = (productoAntes.variantes as Variante[]).filter(
          (actual) =>
            actual.color === variante.color && actual.talla === variante.talla
        );

        const correlativo = existentes.length + 1;
        const { codigoBarra, qrCode } = generarCodigoVariante({
          sku: nuevoSKU,
          color: variante.color,
          talla: variante.talla,
          correlativo,
        });

        return {
          ...variante,
          codigoBarra: variante.codigoBarra || codigoBarra,
          qrCode: variante.qrCode || qrCode,
        };
      });
    }

    const updatePayload = {
      ...data,
      sku: nuevoSKU,
      ...(Array.isArray(variantesProcesadas)
        ? { variantes: variantesProcesadas }
        : {}),
    };

    const productoDespues = await Producto.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true }
    );

    if (!productoDespues) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    if (Array.isArray(variantesProcesadas)) {
      await cleanupRemovedVariantImages(
        productoAntes.variantes as Variante[],
        productoDespues.variantes as Variante[]
      );
    }

    for (const vNueva of productoDespues.variantes) {
      const vAnterior = (productoAntes.variantes as Variante[]).find(
        (v) => v.color === vNueva.color && v.talla === vNueva.talla
      );

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
  } catch (err) {
    console.error("PUT productos error:", err);
    return NextResponse.json(
      { message: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
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

    const producto = await Producto.findById(id);

    if (!producto) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    await cleanupRemovedVariantImages(
      producto.variantes as Variante[],
      []
    );

    await Producto.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Producto eliminado correctamente" }
    );
  } catch (err) {
    console.error("ERROR:", err);
    return NextResponse.json(
      { message: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
