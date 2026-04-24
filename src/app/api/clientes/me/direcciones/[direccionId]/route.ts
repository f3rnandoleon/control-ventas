import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { actualizarDireccionClienteSchema } from "@/schemas/cliente.schema";
import {
  eliminarDireccionClientePorUsuario,
  actualizarDireccionClientePorUsuario,
} from "@/modules/clientes/application/clientes.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ direccionId: string }> }
) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(actualizarDireccionClienteSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { direccionId } = await params;

    const address = await actualizarDireccionClientePorUsuario(
      userAuth.id,
      direccionId,
      validation.data
    );

    return NextResponse.json({
      message: "Direccion actualizada correctamente",
      address,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar direccion",
      logLabel: "PUT clientes/me/direcciones/[direccionId] error:",
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ direccionId: string }> }
) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const { direccionId } = await params;
    const result = await eliminarDireccionClientePorUsuario(userAuth.id, direccionId);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al eliminar direccion",
      logLabel: "DELETE clientes/me/direcciones/[direccionId] error:",
    });
  }
}
