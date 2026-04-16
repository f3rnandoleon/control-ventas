import crypto from "crypto";
import { getVarianteImagenes } from "@/utils/varianteImagen";

const DEFAULT_VARIANTES_FOLDER = "control-ventas/variantes";

type VariantImageLike = {
  imagenes?: string[];
  imagen?: string;
};

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Faltan variables de entorno de Cloudinary");
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: DEFAULT_VARIANTES_FOLDER,
  };
}

function signCloudinaryParams(
  params: Record<string, string>,
  apiSecret: string
) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

function buildCloudinaryUrl(cloudName: string, action: "upload" | "destroy") {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`;
}

async function parseCloudinaryResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || "Error al procesar la imagen";

    throw new Error(message);
  }

  return data as {
    secure_url?: string;
    public_id?: string;
    result?: string;
  };
}

export async function uploadVariantImageToCloudinary(file: File | string) {
  const { cloudName, apiKey, apiSecret, folder } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const paramsToSign: Record<string, string> = {
    folder,
    timestamp,
  };

  if (file instanceof File) {
    paramsToSign.unique_filename = "true";
    paramsToSign.use_filename = "true";
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);

  if (file instanceof File) {
    formData.append("unique_filename", "true");
    formData.append("use_filename", "true");
  }

  formData.append(
    "signature",
    signCloudinaryParams(paramsToSign, apiSecret)
  );

  const response = await fetch(buildCloudinaryUrl(cloudName, "upload"), {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const data = await parseCloudinaryResponse(response);

  if (!data.secure_url) {
    throw new Error("Cloudinary no devolvio la URL de la imagen");
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
  };
}

export async function normalizeVariantImage(image?: string) {
  const trimmed = image?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("data:image/")) {
    const uploaded = await uploadVariantImageToCloudinary(trimmed);
    return uploaded.secureUrl;
  }

  return trimmed;
}

export async function normalizeVariantImages<T extends VariantImageLike>(
  variantes: T[] = []
) {
  return Promise.all(
    variantes.map(async (variante) => {
      const rest = { ...variante };
      delete rest.imagen;
      const imageInputs = getVarianteImagenes(variante);
      const normalizedImages = await Promise.all(
        imageInputs.map((image) => normalizeVariantImage(image))
      );

      return {
        ...rest,
        imagenes: [
          ...new Set(
            normalizedImages.filter(
              (image): image is string => Boolean(image)
            )
          ),
        ],
      };
    })
  );
}

function extractPublicIdFromCloudinaryUrl(imageUrl: string) {
  const { cloudName } = getCloudinaryConfig();

  try {
    const parsedUrl = new URL(imageUrl);

    if (parsedUrl.hostname !== "res.cloudinary.com") {
      return null;
    }

    const parts = parsedUrl.pathname.split("/").filter(Boolean);

    if (parts[0] !== cloudName) {
      return null;
    }

    const uploadIndex = parts.findIndex(
      (part, index) => part === "upload" && parts[index - 1] === "image"
    );

    if (uploadIndex === -1) {
      return null;
    }

    const publicIdParts = parts.slice(uploadIndex + 1);

    if (publicIdParts[0]?.match(/^v\d+$/)) {
      publicIdParts.shift();
    }

    if (publicIdParts.length === 0) {
      return null;
    }

    const lastIndex = publicIdParts.length - 1;
    publicIdParts[lastIndex] = publicIdParts[lastIndex].replace(/\.[^.]+$/, "");

    return decodeURIComponent(publicIdParts.join("/"));
  } catch {
    return null;
  }
}

export async function deleteCloudinaryImageByUrl(imageUrl: string) {
  const publicId = extractPublicIdFromCloudinaryUrl(imageUrl);

  if (!publicId) {
    return false;
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = {
    public_id: publicId,
    timestamp,
  };

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);
  formData.append(
    "signature",
    signCloudinaryParams(paramsToSign, apiSecret)
  );

  const response = await fetch(buildCloudinaryUrl(cloudName, "destroy"), {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const data = await parseCloudinaryResponse(response);
  return data.result === "ok" || data.result === "not found";
}

export async function cleanupRemovedVariantImages(
  previousVariantes: VariantImageLike[] = [],
  nextVariantes: VariantImageLike[] = []
) {
  const nextUrls = new Set(
    nextVariantes
      .flatMap((variante) => getVarianteImagenes(variante))
      .filter((value): value is string => Boolean(value))
  );

  const previousUrls = [
    ...new Set(
      previousVariantes
        .flatMap((variante) => getVarianteImagenes(variante))
        .filter((value): value is string => Boolean(value))
    ),
  ];

  await Promise.all(
    previousUrls
      .filter((url) => !nextUrls.has(url))
      .map(async (url) => {
        try {
          await deleteCloudinaryImageByUrl(url);
        } catch (error) {
          console.error("No se pudo eliminar imagen de Cloudinary:", error);
        }
      })
  );
}

/**
 * Upload genérico de imagen a Cloudinary desde un objeto File del navegador/edge.
 * Usado para subir comprobantes de pago QR.
 */
export async function uploadFileToCloudinary(
  file: File,
  folder: string
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign: Record<string, string> = { folder, timestamp };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);
  formData.append("unique_filename", "true");
  formData.append("use_filename", "true");
  paramsToSign.unique_filename = "true";
  paramsToSign.use_filename = "true";
  formData.append("signature", signCloudinaryParams(paramsToSign, apiSecret));

  const response = await fetch(buildCloudinaryUrl(cloudName, "upload"), {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const data = await parseCloudinaryResponse(response);

  if (!data.secure_url) {
    throw new Error("Cloudinary no devolvio la URL de la imagen");
  }

  return data.secure_url;
}
