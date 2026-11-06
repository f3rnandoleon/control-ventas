import { IBanner, BannerInput } from "@/types/banner";

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function getAdminBanners(): Promise<IBanner[]> {
  const res = await fetch("/api/admin/banners", {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Error al obtener banners"));
  }
  return res.json();
}

export async function createBanner(data: BannerInput): Promise<IBanner> {
  const res = await fetch("/api/admin/banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Error al crear el banner"));
  }
  return res.json();
}

export async function updateBanner(id: string, data: Partial<BannerInput>): Promise<IBanner> {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Error al actualizar el banner"));
  }
  return res.json();
}

export async function toggleBannerStatus(id: string): Promise<{ banner: IBanner; message: string }> {
  const res = await fetch(`/api/admin/banners/${id}/toggle`, {
    method: "PATCH",
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Error al cambiar estado del banner"));
  }
  return res.json();
}

export async function deleteBanner(id: string): Promise<void> {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Error al eliminar el banner"));
  }
}

export async function uploadBannerImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads/banners", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Error al subir la imagen a Cloudinary"));
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function getPublicBanners(): Promise<(IBanner & { actionUrl: string })[]> {
  const res = await fetch("/api/public/banners", {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  return res.json();
}

