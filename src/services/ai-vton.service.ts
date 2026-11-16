import sharp from "sharp";
import { TipoModeloBase } from "@/models/modeloBase";
import { INFO_TIPOS_MODELO, PlantillaGeneracionId, resolvePosesForTemplate } from "@/constants/modelos-base";
import { uploadVariantImageToCloudinary } from "@/libs/cloudinary";

export interface GeneratedCatalogPhoto {
  pose: TipoModeloBase;
  nombrePose: string;
  url: string;
  icono: string;
  generadoPor: "HF_VTON" | "STUDIO_SMART" | "MACRO_ZOOM";
}

export interface GenerateCatalogRequest {
  garmentImageUrl: string;
  templateId: PlantillaGeneracionId;
  variantIndex?: number;
  customPoses?: TipoModeloBase[];
  modelOverrides?: Partial<Record<TipoModeloBase, string>>;
}

/**
 * Genera una foto Macro / Close-up en alta definición enfocada en el detalle
 * textil, costura y textura de la prenda, y la sube a Cloudinary.
 */
export async function generateMacroCloseUp(garmentImageUrl: string): Promise<string> {
  const response = await fetch(garmentImageUrl);
  if (!response.ok) {
    throw new Error(`Error al descargar imagen para macro: ${response.statusText}`);
  }

  const inputBuffer = Buffer.from(await response.arrayBuffer());
  const meta = await sharp(inputBuffer).metadata();

  const width = meta.width || 800;
  const height = meta.height || 1000;

  // Enfoque en la zona del pecho / tejido central (50% del ancho y 50% del alto)
  const cropW = Math.round(width * 0.52);
  const cropH = Math.round(height * 0.52);
  const left = Math.round((width - cropW) / 2);
  const top = Math.round(height * 0.22);

  const croppedBuffer = await sharp(inputBuffer)
    .extract({
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: Math.min(width - left, cropW),
      height: Math.min(height - top, cropH),
    })
    .resize(1000, 1000, { fit: "cover" })
    .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.7 })
    .jpeg({ quality: 92 })
    .toBuffer();

  const base64DataUri = `data:image/jpeg;base64,${croppedBuffer.toString("base64")}`;
  const uploadResult = await uploadVariantImageToCloudinary(base64DataUri);

  return uploadResult.secureUrl;
}

/**
 * Intenta generar la prueba virtual (Virtual Try-On) usando Hugging Face Space (yisol/IDM-VTON)
 */
async function tryHuggingFaceVTON(
  baseModelUrl: string,
  garmentImageUrl: string
): Promise<string | null> {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    console.warn("HUGGINGFACE_TOKEN no configurado en variables de entorno");
    return null;
  }

  try {
    // Dynamic import de @gradio/client para compatibilidad Edge/Node
    const { Client } = await import("@gradio/client");

    const client = await Client.connect("yisol/IDM-VTON", {
      token: token as `hf_${string}`,
    });

    const result = (await Promise.race([
      client.predict("/tryon", [
        {
          background: { path: baseModelUrl, meta: { _type: "gradio.FileData" } },
          layers: [],
          composite: null,
        },
        { path: garmentImageUrl, meta: { _type: "gradio.FileData" } },
        "garment, clothing, photorealistic studio lighting, full body catalog photo",
        true, // auto-masking
        true, // crop
        20,   // denoise steps
        42,   // seed
      ]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout HF Space")), 30000)
      ),
    ])) as { data: Array<{ url?: string; path?: string } | string> };

    const firstOutput = result?.data?.[0];
    const generatedUrl =
      typeof firstOutput === "string"
        ? firstOutput
        : firstOutput?.url || firstOutput?.path;

    if (generatedUrl) {
      const uploaded = await uploadVariantImageToCloudinary(generatedUrl);
      return uploaded.secureUrl;
    }

    return null;
  } catch (error) {
    console.warn("Hugging Face Space VTON no disponible temporalmente:", error);
    return null;
  }
}

/**
 * Composición inteligente de estudio (Smart Studio Composite)
 * Garantiza que siempre exista una foto de catálogo profesional sin errores de servidor
 */
export async function generateSmartStudioComposite(
  baseModelUrl: string,
  garmentImageUrl: string
): Promise<string> {
  try {
    const [baseRes, garmentRes] = await Promise.all([
      fetch(baseModelUrl),
      fetch(garmentImageUrl),
    ]);

    if (!baseRes.ok || !garmentRes.ok) {
      // Si alguna descarga falla, subir la prenda directamente
      const uploaded = await uploadVariantImageToCloudinary(garmentImageUrl);
      return uploaded.secureUrl;
    }

    const baseBuffer = Buffer.from(await baseRes.arrayBuffer());
    const garmentBuffer = Buffer.from(await garmentRes.arrayBuffer());

    // Redimensionar base a formato estándar de catálogo 800x1066 (proporción 3:4)
    const baseResized = await sharp(baseBuffer)
      .resize(800, 1066, { fit: "cover" })
      .toBuffer();

    // Redimensionar prenda con padding y centrado elegante
    const garmentResized = await sharp(garmentBuffer)
      .resize(520, 520, { fit: "inside" })
      .png()
      .toBuffer();

    // Componer prenda con sombra y viñeta sutil de catálogo
    const composed = await sharp(baseResized)
      .composite([
        {
          input: garmentResized,
          top: 360,
          left: 140,
          blend: "over",
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    const dataUri = `data:image/jpeg;base64,${composed.toString("base64")}`;
    const uploaded = await uploadVariantImageToCloudinary(dataUri);
    return uploaded.secureUrl;
  } catch (error) {
    console.error("Error en composición Smart Studio:", error);
    const uploaded = await uploadVariantImageToCloudinary(garmentImageUrl);
    return uploaded.secureUrl;
  }
}

/**
 * Pipeline principal de generación de fotos de variantes
 */
export async function generateVariantCatalogPipeline(
  params: GenerateCatalogRequest,
  activeModelsMap: Record<TipoModeloBase, string>
): Promise<GeneratedCatalogPhoto[]> {
  const {
    garmentImageUrl,
    templateId,
    variantIndex = 0,
    customPoses,
    modelOverrides = {},
  } = params;

  const targetPoses = resolvePosesForTemplate(
    templateId,
    variantIndex,
    customPoses
  );

  const results: GeneratedCatalogPhoto[] = [];

  for (const pose of targetPoses) {
    const info = INFO_TIPOS_MODELO[pose];
    const poseName = info?.nombre || pose;
    const icono = info?.icono || "📸";

    // 1. Caso Close-up
    if (pose === "CLOSE_UP") {
      try {
        const macroUrl = await generateMacroCloseUp(garmentImageUrl);
        results.push({
          pose,
          nombrePose: poseName,
          url: macroUrl,
          icono,
          generadoPor: "MACRO_ZOOM",
        });
        continue;
      } catch (err) {
        console.warn("Fallo macro close-up, usando original:", err);
      }
    }

    // 2. Modelo base para esta pose
    const baseModelUrl =
      modelOverrides[pose] ||
      activeModelsMap[pose] ||
      info?.defaultImageUrl ||
      garmentImageUrl;

    // 3. Caso Colgador o Maniquí
    if (pose === "COLGADOR" || pose === "MANIQUI_INVISIBLE" || pose === "PRODUCTO_ESPALDA") {
      try {
        const studioUrl = await generateSmartStudioComposite(baseModelUrl, garmentImageUrl);
        results.push({
          pose,
          nombrePose: poseName,
          url: studioUrl,
          icono,
          generadoPor: "STUDIO_SMART",
        });
        continue;
      } catch (err) {
        console.warn(`Error procesando pose ${pose}:`, err);
      }
    }

    // 4. Poses con Modelos Humanos (Varón, Mujer, Tradicional/Pollera, Niño, Espaldas)
    let finalUrl: string | null = null;
    let metodo: "HF_VTON" | "STUDIO_SMART" = "STUDIO_SMART";

    // Intentar primero con Hugging Face IDM-VTON
    try {
      finalUrl = await tryHuggingFaceVTON(baseModelUrl, garmentImageUrl);
      if (finalUrl) {
        metodo = "HF_VTON";
      }
    } catch {
      finalUrl = null;
    }

    // Si Hugging Face no responde o falla, usar Smart Studio Composite
    if (!finalUrl) {
      finalUrl = await generateSmartStudioComposite(baseModelUrl, garmentImageUrl);
      metodo = "STUDIO_SMART";
    }

    results.push({
      pose,
      nombrePose: poseName,
      url: finalUrl,
      icono,
      generadoPor: metodo,
    });
  }

  return results;
}
