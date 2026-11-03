import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Sucursal from "@/models/sucursal";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ciudad = searchParams.get("ciudad")?.trim();

    await connectDB();

    const filter: Record<string, unknown> = {
      activa: true,
      visibleEnWebYAgente: { $ne: false },
    };

    if (ciudad) {
      filter.ciudad = { $regex: new RegExp(`^${ciudad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
    }

    const sucursales = await Sucursal.find(filter)
      .select(
        "nombre codigo tipo direccion ciudad telefono ubicacionMapa permiteVentaPOS permiteRetiroCliente"
      )
      .sort({ ciudad: 1, nombre: 1 })
      .lean();

    const ubicaciones = sucursales.map((s) => {
      const lat = s.ubicacionMapa?.lat ?? null;
      const lng = s.ubicacionMapa?.lng ?? null;
      const fallbackMapsUrl =
        lat !== null && lng !== null
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : null;

      return {
        id: String(s._id),
        nombre: s.nombre,
        codigo: s.codigo,
        tipo: s.tipo,
        ciudad: s.ciudad,
        direccion: s.direccion || "",
        telefono: s.telefono || "",
        permiteVentaPOS: Boolean(s.permiteVentaPOS),
        permiteRetiroCliente: Boolean(s.permiteRetiroCliente),
        ubicacionMapa: {
          googleMapsUrl: s.ubicacionMapa?.googleMapsUrl || fallbackMapsUrl || "",
          embedUrl: s.ubicacionMapa?.embedUrl || "",
          lat,
          lng,
          referencia: s.ubicacionMapa?.referencia || "",
          horariosTexto: s.ubicacionMapa?.horariosTexto || "",
        },
      };
    });

    return NextResponse.json({
      total: ubicaciones.length,
      ubicaciones,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener ubicaciones",
      logLabel: "GET /api/ubicaciones error:",
    });
  }
}

