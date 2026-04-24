import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { actualizarPerfilClienteSchema } from "@/schemas/cliente.schema";
import {
  obtenerContextoClientePorUsuario,
  actualizarPerfilClientePorUsuario,
} from "@/modules/clientes/application/clientes.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const customer = await obtenerContextoClientePorUsuario(userAuth.id, {
      ensureProfile: true,
    });

    return NextResponse.json(customer);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener perfil de cliente",
      logLabel: "GET clientes/me error:",
    });
  }
}

export async function PUT(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(actualizarPerfilClienteSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const customer = await actualizarPerfilClientePorUsuario(
      userAuth.id,
      validation.data
    );

    return NextResponse.json(customer);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar perfil de cliente",
      logLabel: "PUT clientes/me error:",
    });
  }
}
