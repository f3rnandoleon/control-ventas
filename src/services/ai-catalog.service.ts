import { TipoModeloBase, IModeloBase } from "@/models/modeloBase";
import { PlantillaGeneracionId } from "@/constants/modelos-base";
import { GeneratedCatalogPhoto } from "@/services/ai-vton.service";

export interface DetectColorsResponse {
  colorPrincipal: string;
  colorSecundario?: string;
  confianza?: string;
}

export async function detectVariantColors(
  imageInput: string | File
): Promise<DetectColorsResponse> {
  let response: Response;

  if (imageInput instanceof File) {
    const formData = new FormData();
    formData.append("file", imageInput);
    response = await fetch("/api/ai/detect-variant-colors", {
      method: "POST",
      body: formData,
    });
  } else {
    response = await fetch("/api/ai/detect-variant-colors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: imageInput }),
    });
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Error al detectar colores con IA");
  }

  return data as DetectColorsResponse;
}

export interface GenerateVariantPhotosPayload {
  garmentImageUrl: string;
  templateId: PlantillaGeneracionId;
  variantIndex?: number;
  customPoses?: TipoModeloBase[];
  modelOverrides?: Partial<Record<TipoModeloBase, string>>;
}

export async function generateVariantPhotos(
  payload: GenerateVariantPhotosPayload
): Promise<GeneratedCatalogPhoto[]> {
  const response = await fetch("/api/ai/generate-variant-photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Error al generar fotos con IA");
  }

  return data.photos as GeneratedCatalogPhoto[];
}

export async function getModelosBase(): Promise<IModeloBase[]> {
  const response = await fetch("/api/admin/modelos-base");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Error al obtener modelos base");
  }
  return data as IModeloBase[];
}

export async function createModeloBase(
  modelo: Partial<IModeloBase>
): Promise<IModeloBase> {
  const response = await fetch("/api/admin/modelos-base", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modelo),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Error al registrar modelo base");
  }
  return data as IModeloBase;
}

export async function updateModeloBase(
  id: string,
  updates: Partial<IModeloBase>
): Promise<IModeloBase> {
  const response = await fetch(`/api/admin/modelos-base/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Error al actualizar modelo base");
  }
  return data as IModeloBase;
}

export async function deleteModeloBase(id: string): Promise<void> {
  const response = await fetch(`/api/admin/modelos-base/${id}`, {
    method: "DELETE",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Error al eliminar modelo base");
  }
}

export async function uploadModeloBaseImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads/modelos-base", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Error al subir imagen del modelo a Cloudinary");
  }

  return data.url as string;
}

