import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { uploadFileToCloudinary } from "@/libs/cloudinary";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { uploadComprobanteAndGenerateToken } from "@/modules/payments/application/payments.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/payments/:id/upload-comprobante
 * El cliente (CLIENTE) sube la imagen del comprobante QR.
 * - Acepta multipart/form-data con campo "file" (imagen, max 5 MB).
 * - Sube la imagen a Cloudinary en la carpeta "control-ventas/comprobantes".
 * - Genera un reviewToken único (UUID) y lo guarda en el PaymentTransaction.
 * - Devuelve el link de verificación para que el frontend lo envíe al admin por WhatsApp.
 */
export async function POST(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);
    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    if (userAuth.role !== "CLIENTE") {
      return NextResponse.json(
        { message: "Solo clientes pueden subir comprobantes" },
        { status: 403 }
      );
    }

    const { id: paymentId } = await context.params;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "El archivo del comprobante es obligatorio" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "El archivo debe ser una imagen" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "El archivo no puede superar 5 MB" },
        { status: 400 }
      );
    }

    const comprobanteUrl = await uploadFileToCloudinary(
      file,
      "control-ventas/comprobantes"
    );

    const { payment, reviewToken } = await uploadComprobanteAndGenerateToken(
      paymentId,
      comprobanteUrl,
      userAuth.id
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://control-ventas-azure.vercel.app";
    const verifyLink = `${appUrl}/verificar/pago/${reviewToken}`;

    return NextResponse.json(
      {
        message: "Comprobante subido correctamente",
        comprobanteUrl: payment.comprobanteUrl,
        verifyLink,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al subir el comprobante",
      logLabel: "POST payments/upload-comprobante error:",
    });
  }
}
