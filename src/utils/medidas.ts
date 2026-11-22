import type { MedidaTallaItem, MedidasPrenda } from "@/types/producto";

const TALLA_ORDER = [
  "2",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "3XL",
];

export function compareTallasOrden(a: string, b: string): number {
  const normA = a.trim().toUpperCase();
  const normB = b.trim().toUpperCase();
  const idxA = TALLA_ORDER.indexOf(normA);
  const idxB = TALLA_ORDER.indexOf(normB);

  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return normA.localeCompare(normB, "es", { numeric: true });
}

export function hasMedidasValues(medidas?: MedidasPrenda | null): boolean {
  if (!medidas) return false;
  return Boolean(
    (typeof medidas.anchoPecho === "number" && medidas.anchoPecho > 0) ||
      (typeof medidas.anchoHombros === "number" && medidas.anchoHombros > 0) ||
      (typeof medidas.largoTotal === "number" && medidas.largoTotal > 0) ||
      (typeof medidas.largoMangaAxila === "number" && medidas.largoMangaAxila > 0) ||
      (typeof medidas.largoMangaHombro === "number" && medidas.largoMangaHombro > 0)
  );
}

export function extractMedidasPrenda(
  source?: Partial<MedidasPrenda> | null
): MedidasPrenda | undefined {
  if (!source) return undefined;

  const clean: MedidasPrenda = {};
  if (typeof source.anchoPecho === "number" && Number.isFinite(source.anchoPecho) && source.anchoPecho > 0) {
    clean.anchoPecho = source.anchoPecho;
  }
  if (typeof source.anchoHombros === "number" && Number.isFinite(source.anchoHombros) && source.anchoHombros > 0) {
    clean.anchoHombros = source.anchoHombros;
  }
  if (typeof source.largoTotal === "number" && Number.isFinite(source.largoTotal) && source.largoTotal > 0) {
    clean.largoTotal = source.largoTotal;
  }
  if (typeof source.largoMangaAxila === "number" && Number.isFinite(source.largoMangaAxila) && source.largoMangaAxila > 0) {
    clean.largoMangaAxila = source.largoMangaAxila;
  }
  if (typeof source.largoMangaHombro === "number" && Number.isFinite(source.largoMangaHombro) && source.largoMangaHombro > 0) {
    clean.largoMangaHombro = source.largoMangaHombro;
  }

  return Object.keys(clean).length > 0 ? clean : undefined;
}

export function sanitizeMedidasPorTalla(
  items?: Array<Partial<MedidaTallaItem>> | null
): MedidaTallaItem[] {
  if (!Array.isArray(items)) return [];

  const byKey = new Map<string, MedidaTallaItem>();

  for (const item of items) {
    const talla = typeof item?.talla === "string" ? item.talla.trim() : "";
    if (!talla) continue;

    const cleanMedidas = extractMedidasPrenda(item);
    if (!cleanMedidas) continue;

    byKey.set(talla.toLowerCase(), {
      talla,
      ...cleanMedidas,
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    compareTallasOrden(a.talla, b.talla)
  );
}

type ProductoConMedidasLike = {
  medidasPorTalla?: Array<Partial<MedidaTallaItem>> | null;
  variantes?: Array<{
    talla?: string | null;
    medidas?: Partial<MedidasPrenda> | null;
  }> | null;
};

/**
 * Construye la tabla efectiva de medidas por talla del producto:
 * 1. Prioriza `producto.medidasPorTalla` (fuente oficial por producto).
 * 2. Como respaldo legacy, agrega cualquier talla que todavía tenga medidas en `variantes[].medidas`.
 */
export function buildEffectiveMedidasPorTalla(
  producto?: ProductoConMedidasLike | null
): MedidaTallaItem[] {
  if (!producto) return [];

  const byKey = new Map<string, MedidaTallaItem>();

  for (const item of sanitizeMedidasPorTalla(producto.medidasPorTalla)) {
    byKey.set(item.talla.toLowerCase(), item);
  }

  for (const variante of producto.variantes || []) {
    const talla = typeof variante?.talla === "string" ? variante.talla.trim() : "";
    if (!talla) continue;
    const key = talla.toLowerCase();
    if (byKey.has(key)) continue;

    const cleanMedidas = extractMedidasPrenda(variante.medidas);
    if (cleanMedidas) {
      byKey.set(key, {
        talla,
        ...cleanMedidas,
      });
    }
  }

  return Array.from(byKey.values()).sort((a, b) =>
    compareTallasOrden(a.talla, b.talla)
  );
}

/**
 * Resuelve las medidas aplicables a una talla dentro de un producto.
 * Prioridad: `producto.medidasPorTalla` -> `varianteMedidas` (legacy) -> otra variante de la misma talla.
 */
export function resolveMedidasForTalla(
  producto: ProductoConMedidasLike | null | undefined,
  talla: string | null | undefined,
  varianteMedidas?: Partial<MedidasPrenda> | null
): MedidasPrenda | undefined {
  const tallaNorm = typeof talla === "string" ? talla.trim().toLowerCase() : "";

  if (tallaNorm && Array.isArray(producto?.medidasPorTalla)) {
    const match = producto.medidasPorTalla.find(
      (m) => typeof m?.talla === "string" && m.talla.trim().toLowerCase() === tallaNorm
    );
    const cleanMatch = extractMedidasPrenda(match);
    if (cleanMatch) return cleanMatch;
  }

  const cleanVar = extractMedidasPrenda(varianteMedidas);
  if (cleanVar) return cleanVar;

  if (tallaNorm && Array.isArray(producto?.variantes)) {
    for (const v of producto.variantes) {
      if (typeof v?.talla === "string" && v.talla.trim().toLowerCase() === tallaNorm) {
        const cleanFallback = extractMedidasPrenda(v.medidas);
        if (cleanFallback) return cleanFallback;
      }
    }
  }

  return undefined;
}
