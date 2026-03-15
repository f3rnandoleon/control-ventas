async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((error: { message: string }) => error.message).join(", ");
    }

    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function uploadVarianteImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads/variantes", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Error al subir la imagen")
    );
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export async function uploadVarianteImages(files: File[]) {
  return Promise.all(files.map((file) => uploadVarianteImage(file)));
}
