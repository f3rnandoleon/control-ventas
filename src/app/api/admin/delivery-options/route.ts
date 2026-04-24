import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { resolveApiAuth } from "@/libs/resolveApiAuth";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth || userAuth.rol !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const filePath = path.join(process.cwd(), "data", "delivery-options.json");

    // Validacion basica: asegurar que sea un objeto con las secciones correctas
    if (!body.pickupPoints || !body.pickupSchedules || !body.shippingCompanies) {
      return NextResponse.json(
        { message: "Datos de entrega invalidos" },
        { status: 400 }
      );
    }

    await fs.writeFile(filePath, JSON.stringify(body, null, 2), "utf-8");

    return NextResponse.json({
      message: "Opciones de entrega actualizadas correctamente",
      data: body,
    });
  } catch (error) {
    console.error("Error updating delivery options:", error);
    return NextResponse.json(
      { message: "Error al actualizar las opciones de entrega" },
      { status: 500 }
    );
  }
}
