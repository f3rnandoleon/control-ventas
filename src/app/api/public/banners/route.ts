import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Banner from "@/models/banner";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();
    const now = new Date();

    const query = {
      activo: true,
      $and: [
        {
          $or: [
            { fechaInicio: { $exists: false } },
            { fechaInicio: null },
            { fechaInicio: { $lte: now } },
          ],
        },
        {
          $or: [
            { fechaFin: { $exists: false } },
            { fechaFin: null },
            { fechaFin: { $gte: now } },
          ],
        },
      ],
    };

    const banners = await Banner.find(query)
      .sort({ orden: 1, createdAt: -1 })
      .select("-__v")
      .lean();

    // Enriquecer con url formateada de WhatsApp para que la web solo haga <a href={banner.actionUrl}>
    const enrichedBanners = banners.map((b) => {
      let actionUrl = b.enlaceUrl || "";
      if (b.tipoAccion === "WHATSAPP") {
        const phone = (b.whatsappNumero || "67113105").replace(/\D/g, "");
        const fullPhone = phone.startsWith("591") ? phone : `591${phone}`;
        const defaultText =
          b.whatsappMensaje?.trim() ||
          `¡Hola! Vi el banner "${b.titulo}" en su tienda web y deseo más información de las prendas.\nFoto: ${b.imagenDesktopUrl}`;
        actionUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(defaultText)}`;
      }

      return {
        ...b,
        actionUrl,
      };
    });

    return NextResponse.json(enrichedBanners, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener banners públicos",
      logLabel: "PUBLIC BANNERS GET ERROR:",
    });
  }
}

