/**
 * Utilidades para procesar y renderizar enlaces de Google Maps.
 */

export function extractIframeSrc(input: string): string | null {
  if (!input) return null;
  const match = input.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export function parseGoogleMapsEmbedUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();

  // Si pegaron la etiqueta iframe completa
  if (trimmed.includes("<iframe")) {
    const extracted = extractIframeSrc(trimmed);
    if (extracted) return extracted;
  }

  // Si ya es una URL de embed de Google Maps
  if (trimmed.includes("google.com/maps/embed")) {
    return trimmed;
  }

  // Si contiene coordenadas en la URL: @-16.5023,-68.1534
  const coordsMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordsMatch) {
    const lat = coordsMatch[1];
    const lng = coordsMatch[2];
    return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }

  // Si tiene query param: ?q= o ?query=
  const queryMatch = trimmed.match(/[?&](?:q|query)=([^&]+)/);
  if (queryMatch) {
    const query = decodeURIComponent(queryMatch[1]);
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }

  // Si contiene /place/Nombre+Del+Lugar
  const placeMatch = trimmed.match(/\/maps\/place\/([^/@?]+)/);
  if (placeMatch) {
    const place = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }

  // Enlaces cortos (maps.app.goo.gl o goo.gl): los iframes pueden ser bloqueados por X-Frame-Options
  // Si no podemos extraer el query directo, retornamos null para que la UI ofrezca apertura directa
  if (trimmed.includes("goo.gl") || trimmed.includes("maps.app.goo.gl")) {
    return null;
  }

  // Fallback genérico para cualquier URL con búsqueda
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("google.")) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    }
  } catch {
    // URL no parseable
  }

  return null;
}

export function cleanGoogleMapsLink(rawUrl: string): string {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  if (trimmed.includes("<iframe")) {
    const extracted = extractIframeSrc(trimmed);
    if (extracted) return extracted;
  }
  return trimmed;
}

