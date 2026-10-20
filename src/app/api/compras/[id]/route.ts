import { NextResponse } from "next/server";
import {
  obtenerCompraPorId,
  anularCompra,
  actualizarCompra,
  reemplazarCompra,
} from "@/modules/purchases/application/compras.service";
import { createCompraSchema } from "@/schemas/compra.schema";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const compra = await obtenerCompraPorId(id);
    return NextResponse.json(compra);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener detalle de la compra",
      logLabel: "COMPRA DETAIL GET ERROR:",
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const compraActualizada = await actualizarCompra(id, body, auth.userAuth.id);
    return NextResponse.json({
      message: "Compra actualizada exitosamente",
      compra: compraActualizada,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar compra",
      logLabel: "COMPRA PATCH ERROR:",
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    let motivo: string | undefined;
    try {
      const body = await request.json();
      motivo = body.motivo;
    } catch {
      // Si no viene body json
    }

    const compraAnulada = await anularCompra(id, auth.userAuth.id, motivo);
    return NextResponse.json({
      message: "Compra anulada exitosamente. Stock y egresos monetarios revertidos.",
      compra: compraAnulada,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al anular compra",
      logLabel: "COMPRA DELETE/ANULAR ERROR:",
    });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const validation = createCompraSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Datos de compra inválidos", errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const nuevaCompra = await reemplazarCompra(
      id,
      validation.data,
      auth.userAuth.id,
      body.motivo
    );

    return NextResponse.json({
      message: "Compra corregida y reemplazada exitosamente",
      compra: nuevaCompra,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al corregir y reemplazar la compra",
      logLabel: "COMPRA PUT/REPLACE ERROR:",
    });
  }
}
