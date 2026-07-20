import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { replaceDeliveryOptions } from "@/modules/delivery-options/application/delivery-options.service";
import { deliveryOptionsSchema } from "@/schemas/delivery-options.schema";
import { isAppError } from "@/shared/errors/AppError";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.rol !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const parsed = deliveryOptionsSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos de entrega invalidos",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = await replaceDeliveryOptions(parsed.data, {
      id: userAuth.id,
      rol: "ADMIN",
    });

    return NextResponse.json({
      message: "Opciones de entrega actualizadas correctamente",
      data,
    });
  } catch (error) {
    console.error("Error updating delivery options:", error);
    return NextResponse.json(
      {
        message: isAppError(error)
          ? error.message
          : "Error al actualizar las opciones de entrega",
        ...(isAppError(error) && error.code ? { code: error.code } : {}),
      },
      { status: isAppError(error) ? error.statusCode : 500 }
    );
  }
}
