import { COLOR_OPTIONS } from "@/constants/variant-options";

export interface DetectedColors {
  colorPrincipal: string;
  colorSecundario?: string;
  confianza?: string;
}

const AVAILABLE_COLOR_NAMES = COLOR_OPTIONS.map((c) => c.value);

/**
 * Normaliza y empareja el color detectado por la IA con una de las 91 opciones oficiales
 */
export function matchAllowedColor(rawColorName?: string | null): string | undefined {
  if (!rawColorName) return undefined;
  const target = rawColorName.trim().toLowerCase();

  // 1. Coincidencia exacta
  const exact = AVAILABLE_COLOR_NAMES.find(
    (name) => name.toLowerCase() === target
  );
  if (exact) return exact;

  // 2. Coincidencia por partes compuestas separadas por '/' (ej. "Jeans" en "Denim / Jeans")
  const slashMatch = AVAILABLE_COLOR_NAMES.find((name) => {
    if (name.includes("/")) {
      const parts = name.split("/").map((p) => p.trim().toLowerCase());
      return parts.includes(target);
    }
    return false;
  });
  if (slashMatch) return slashMatch;

  // 3. Coincidencia de inclusión (substring)
  const includesMatch = AVAILABLE_COLOR_NAMES.find((name) => {
    const lower = name.toLowerCase();
    return lower.includes(target) || target.includes(lower);
  });
  if (includesMatch) return includesMatch;

  // 4. Si no hubo coincidencia, devolver el valor original formateado
  return rawColorName.trim();
}

/**
 * Llama a la API de Google Gemini (2.0 / 3.5 Flash) para identificar colores
 */
export async function detectColorsWithGemini(
  imageSource: string | Buffer,
  mimeType: string = "image/jpeg"
): Promise<DetectedColors> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no configurado en variables de entorno");
  }

  const modelName =
    process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-3.5-flash-lite";

  let base64Data: string;

  if (typeof imageSource === "string") {
    if (imageSource.startsWith("data:")) {
      const commaIdx = imageSource.indexOf(",");
      base64Data = commaIdx !== -1 ? imageSource.slice(commaIdx + 1) : imageSource;
    } else if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
      const response = await fetch(imageSource);
      if (!response.ok) {
        throw new Error(`No se pudo descargar la imagen para análisis: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
    } else {
      base64Data = imageSource;
    }
  } else {
    base64Data = imageSource.toString("base64");
  }

  const prompt = `Eres un experto clasificador de colores para una tienda de ropa y textiles de moda.
Analiza la prenda principal en la fotografía proporcionada y selecciona:
1. "colorPrincipal": El color dominante de la prenda, escogiendo OBLIGATORIAMENTE la opción más exacta de esta lista oficial de colores:
[${AVAILABLE_COLOR_NAMES.join(", ")}]

2. "colorSecundario": Si la prenda tiene un segundo color relevante (estampados, rayas, cuello, mangas de otro color, bordados, detalles), indícalo escogiendo de la misma lista oficial. Si la prenda es monocromática o de un solo color sólido, coloca null.

Responde ÚNICAMENTE un objeto JSON estricto con esta estructura:
{
  "colorPrincipal": "Nombre exacto de la lista",
  "colorSecundario": "Nombre exacto de la lista o null"
}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.2,
    },
  };

  // Intentar con el modelo configurado, con fallback a gemini-3.5-flash-lite si falla
  const modelsToTry = [modelName, "gemini-3.5-flash-lite", "gemini-flash-latest"];
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError: Error | null = null;

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || `Error HTTP ${res.status}`);
      }

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Gemini no devolvió contenido de texto");
      }

      const parsed = JSON.parse(rawText);

      const colorPrincipal = matchAllowedColor(parsed.colorPrincipal) || "Negro";
      const colorSecundario = matchAllowedColor(parsed.colorSecundario);

      return {
        colorPrincipal,
        colorSecundario: colorSecundario || undefined,
        confianza: "ALTA",
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Intento con modelo ${model} falló:`, lastError.message);
    }
  }

  throw lastError || new Error("No se pudo detectar el color de la prenda con Gemini");
}

