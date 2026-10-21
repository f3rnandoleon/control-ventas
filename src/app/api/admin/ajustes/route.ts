import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  getAjustes,
  updateAjustes,
} from "@/modules/ajustes/application/ajustes.service";
import { updateAjustesSchema } from "@/schemas/ajustes.schema";
import { isAppError } from "@/shared/errors/AppError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.rol !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const data = await getAjustes();

    return NextResponse.json({
      message: "Ajustes obtenidos correctamente",
      data,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      {
        message: isAppError(error)
          ? error.message
          : "Error al obtener ajustes del sistema",
      },
      { status: isAppError(error) ? error.statusCode : 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.rol !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const json = await request.json();
    const parsed = updateAjustesSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos de ajustes inválidos",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = await updateAjustes(parsed.data, {
      id: userAuth.id,
      rol: "ADMIN",
    });

    return NextResponse.json({
      message: "Ajustes actualizados correctamente",
      data,
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      {
        message: isAppError(error)
          ? error.message
          : "Error al actualizar los ajustes del sistema",
        ...(isAppError(error) && error.code ? { code: error.code } : {}),
      },
      { status: isAppError(error) ? error.statusCode : 500 }
    );
  }
}

export const PATCH = PUT;
