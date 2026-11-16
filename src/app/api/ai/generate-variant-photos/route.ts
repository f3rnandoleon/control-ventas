import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import ModeloBase, { TipoModeloBase } from "@/models/modeloBase";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { INFO_TIPOS_MODELO } from "@/constants/modelos-base";
import { generateVariantCatalogPipeline } from "@/services/ai-vton.service";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 segundos máx para Next.js / Edge / Vercel

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { garmentImageUrl, templateId, variantIndex, customPoses, modelOverrides } = body;

    if (!garmentImageUrl || typeof garmentImageUrl !== "string") {
      return NextResponse.json(
        { message: "Se requiere la URL de la imagen de la prenda (garmentImageUrl)" },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { message: "Se requiere el ID de la plantilla (templateId)" },
        { status: 400 }
      );
    }

    await connectDB();

    // Obtener los modelos base activos de MongoDB
    const modelosDB = await ModeloBase.find({ activo: true }).lean();

    const activeModelsMap: Record<TipoModeloBase, string> = {} as Record<TipoModeloBase, string>;

    // Primero poblar con defaults de INFO_TIPOS_MODELO
    for (const [tipo, info] of Object.entries(INFO_TIPOS_MODELO)) {
      activeModelsMap[tipo as TipoModeloBase] = info.defaultImageUrl;
    }

    // Sobrescribir con los modelos configurados en base de datos (priorizando esDefault: true)
    for (const mod of modelosDB) {
      if (mod.esDefault || !activeModelsMap[mod.tipo as TipoModeloBase]) {
        activeModelsMap[mod.tipo as TipoModeloBase] = mod.imagenUrl;
      }
    }

    const generatedPhotos = await generateVariantCatalogPipeline(
      {
        garmentImageUrl,
        templateId,
        variantIndex: typeof variantIndex === "number" ? variantIndex : 0,
        customPoses,
        modelOverrides,
      },
      activeModelsMap
    );

    return NextResponse.json({
      photos: generatedPhotos,
      count: generatedPhotos.length,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al generar fotos de catálogo con IA",
      logLabel: "AI GENERATE VARIANT PHOTOS ERROR:",
    });
  }
}

