import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { crearDireccionClienteSchema } from "@/schemas/cliente.schema";
import {
  crearDireccionClientePorUsuario,
  listarDireccionesClientePorUsuario,
} from "@/modules/clientes/application/clientes.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const addresses = await listarDireccionesClientePorUsuario(userAuth.id);
    return NextResponse.json(addresses);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener direcciones",
      logLabel: "GET clientes/me/direcciones error:",
    });
  }
}

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(crearDireccionClienteSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const address = await crearDireccionClientePorUsuario(
      userAuth.id,
      validation.data
    );

    return NextResponse.json(
      {
        message: "Direccion creada correctamente",
        address,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al crear direccion",
      logLabel: "POST clientes/me/direcciones error:",
    });
  }
}
