type VarianteImagenLike = {
  imagen?: string;
  imagenes?: string[];
};

function normalizeImageUrl(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getVarianteImagenes(variante?: VarianteImagenLike | null) {
  const urls = new Set<string>();

  const legacyImage = normalizeImageUrl(variante?.imagen);
  if (legacyImage) {
    urls.add(legacyImage);
  }

  for (const image of variante?.imagenes ?? []) {
    const normalized = normalizeImageUrl(image);
    if (normalized) {
      urls.add(normalized);
    }
  }

  return [...urls];
}

export function getVarianteImagenPrincipal(
  variante?: VarianteImagenLike | null
) {
  return getVarianteImagenes(variante)[0];
}
