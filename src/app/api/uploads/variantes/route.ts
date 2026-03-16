import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { uploadVariantImageToCloudinary } from "@/libs/cloudinary";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role");

    if (role !== "ADMIN") {
      return NextResponse.json(
        { message: "Solo ADMIN puede subir imagenes de variantes" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "No se envio ninguna imagen" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "El archivo debe ser una imagen valida" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "La imagen no puede superar los 5 MB" },
        { status: 400 }
      );
    }

    const uploaded = await uploadVariantImageToCloudinary(file);

    return NextResponse.json(
      { url: uploaded.secureUrl },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/uploads/variantes error:", error);

    return NextResponse.json(
      { message: "No se pudo subir la imagen a Cloudinary" },
      { status: 500 }
    );
  }
}
