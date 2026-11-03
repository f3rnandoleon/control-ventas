import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Sucursal from "@/models/sucursal";
import { verifyWhatsAppApiKey } from "@/modules/integrations/whatsapp/whatsapp.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!verifyWhatsAppApiKey(request)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ciudad = searchParams.get("ciudad")?.trim();

    await connectDB();

    const filter: Record<string, unknown> = {
      activa: true,
      visibleEnWebYAgente: { $ne: false },
    };

    if (ciudad) {
      filter.ciudad = {
        $regex: new RegExp(`^${ciudad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      };
    }

    const sucursales = await Sucursal.find(filter)
      .select(
        "nombre codigo tipo direccion ciudad telefono ubicacionMapa permiteVentaPOS permiteRetiroCliente"
      )
      .sort({ ciudad: 1, nombre: 1 })
      .lean();

    const locations = sucursales.map((s) => {
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
        referencia: s.ubicacionMapa?.referencia || "",
        horarios: s.ubicacionMapa?.horariosTexto || "",
        telefono: s.telefono || "",
        googleMapsUrl: s.ubicacionMapa?.googleMapsUrl || fallbackMapsUrl || "",
        coordenadas:
          lat !== null && lng !== null
            ? { lat, lng }
            : null,
        permiteTiendaFisica: Boolean(s.permiteVentaPOS),
        permiteRetiroPedido: Boolean(s.permiteRetiroCliente),
      };
    });

    return NextResponse.json(
      {
        total: locations.length,
        locations,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener ubicaciones para WhatsApp",
      logLabel: "GET /api/integrations/whatsapp/locations error:",
    });
  }
}

