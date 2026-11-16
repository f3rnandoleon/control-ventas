import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/libs/requireApiAuth";
import { detectColorsWithGemini } from "@/services/gemini-color.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const contentType = request.headers.get("content-type") || "";

    let imageInput: string | Buffer;
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { message: "No se proporcionó ningún archivo de imagen" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      imageInput = buffer;
      mimeType = file.type || "image/jpeg";
    } else {
      const body = await request.json();
      const { imageUrl, base64 } = body;

      if (!imageUrl && !base64) {
        return NextResponse.json(
          { message: "Debes enviar imageUrl o base64 de la imagen" },
          { status: 400 }
        );
      }

      imageInput = base64 || imageUrl;
    }

    const result = await detectColorsWithGemini(imageInput, mimeType);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al detectar colores con IA",
      logLabel: "AI DETECT COLORS ERROR:",
    });
  }
}

