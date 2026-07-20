import { NextResponse } from "next/server";
import { getDeliveryOptions } from "@/modules/delivery-options/application/delivery-options.service";
import { isAppError } from "@/shared/errors/AppError";

export const runtime = "nodejs";

export async function GET() {
  try {
    const options = await getDeliveryOptions();
    return NextResponse.json(options);
  } catch (error) {
    console.error("Error reading delivery options:", error);
    return NextResponse.json(
      {
        message: isAppError(error)
          ? error.message
          : "Error al obtener las opciones de entrega",
        ...(isAppError(error) && error.code ? { code: error.code } : {}),
      },
      { status: isAppError(error) ? error.statusCode : 500 }
    );
  }
}
