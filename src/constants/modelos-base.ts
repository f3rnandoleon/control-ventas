import { TipoModeloBase } from "@/models/modeloBase";

export interface TipoModeloInfo {
  tipo: TipoModeloBase;
  nombre: string;
  descripcion: string;
  icono: string;
  defaultImageUrl: string;
}

export const INFO_TIPOS_MODELO: Record<TipoModeloBase, TipoModeloInfo> = {
  VARON: {
    tipo: "VARON",
    nombre: "Modelo Varón (Frente)",
    descripcion: "Modelo masculino posando de frente con iluminación de estudio.",
    icono: "👨",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80",
  },
  MUJER: {
    tipo: "MUJER",
    nombre: "Modelo Mujer (Frente)",
    descripcion: "Modelo femenina posando de frente con iluminación de estudio.",
    icono: "👩",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
  },
  MUJER_POLLERA: {
    tipo: "MUJER_POLLERA",
    nombre: "Modelo Mujer de Pollera",
    descripcion: "Modelo tradicional con vestimenta y estilo folclórico boliviano.",
    icono: "💃",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80",
  },
  NINO: {
    tipo: "NINO",
    nombre: "Modelo Infantil (Niño/a)",
    descripcion: "Modelo infantil sonriente para catálogo de niños y niñas.",
    icono: "🧒",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800&auto=format&fit=crop&q=80",
  },
  COLGADOR: {
    tipo: "COLGADOR",
    nombre: "Prenda en Colgador",
    descripcion: "Toma fotográfica limpia en percha/colgador con fondo minimalista.",
    icono: "🧥",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=800&auto=format&fit=crop&q=80",
  },
  MANIQUI_INVISIBLE: {
    tipo: "MANIQUI_INVISIBLE",
    nombre: "Maniquí Invisible (Ghost Mannequin)",
    descripcion: "Efecto 3D de prenda con volumen y fondo blanco recortado.",
    icono: "🧍",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop&q=80",
  },
  VARON_ESPALDA: {
    tipo: "VARON_ESPALDA",
    nombre: "Modelo Varón (Espalda)",
    descripcion: "Vista posterior del modelo masculino mostrando diseño de espalda.",
    icono: "🚶‍♂️",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80",
  },
  MUJER_ESPALDA: {
    tipo: "MUJER_ESPALDA",
    nombre: "Modelo Mujer (Espalda)",
    descripcion: "Vista posterior de la modelo femenina mostrando diseño de espalda.",
    icono: "🚶‍♀️",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
  },
  PRODUCTO_ESPALDA: {
    tipo: "PRODUCTO_ESPALDA",
    nombre: "Producto de Espalda",
    descripcion: "Vista dorsal o reversa directa de la prenda de vestir.",
    icono: "🔄",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=80",
  },
  CLOSE_UP: {
    tipo: "CLOSE_UP",
    nombre: "Close-up / Detalle Textura",
    descripcion: "Acercamiento macro al tejido, costura o logotipo para verificar calidad.",
    icono: "🔍",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80",
  },
};

export type PlantillaGeneracionId =
  | "UNISEX_ADULTO"
  | "TRADICIONAL_POLLERA"
  | "INFANTIL"
  | "FAMILIAR"
  | "VARON"
  | "MUJER"
  | "POLERA"
  | "MANUAL";

export interface PlantillaConfig {
  id: PlantillaGeneracionId;
  nombre: string;
  descripcion: string;
  badge: string;
  defaultPoses: TipoModeloBase[];
  esIntercalada?: boolean;
}

export const PLANTILLAS_CATALOGO: PlantillaConfig[] = [
  {
    id: "UNISEX_ADULTO",
    nombre: "🌟 Plantilla Unisex Adulto",
    descripcion:
      "Intercala la 1ra foto entre Varón y Mujer por cada variante (v1: Varón+Colgador+Mujer+Close-up, v2: Mujer+Colgador+Varón+Close-up).",
    badge: "Más Usada",
    defaultPoses: ["VARON", "COLGADOR", "MUJER", "CLOSE_UP"],
    esIntercalada: true,
  },
  {
    id: "TRADICIONAL_POLLERA",
    nombre: "🌟 Plantilla Tradicional / Pollera",
    descripcion:
      "Intercala la 1ra foto entre Mujer de Pollera y Mujer estándar (Mujer de Pollera + Colgador + Mujer + Close-up).",
    badge: "Tradicional",
    defaultPoses: ["MUJER_POLLERA", "COLGADOR", "MUJER", "CLOSE_UP"],
    esIntercalada: true,
  },
  {
    id: "INFANTIL",
    nombre: "🌟 Plantilla Infantil",
    descripcion: "Especial para niños y bebés (Niño + Colgador + Close-up).",
    badge: "Kids",
    defaultPoses: ["NINO", "COLGADOR", "CLOSE_UP"],
  },
  {
    id: "FAMILIAR",
    nombre: "🌟 Plantilla Familiar",
    descripcion: "Conjunto para toda la familia (Varón + Colgador + Mujer + Niño).",
    badge: "Pack",
    defaultPoses: ["VARON", "COLGADOR", "MUJER", "NINO"],
  },
  {
    id: "VARON",
    nombre: "🌟 Plantilla Varón",
    descripcion: "Enfoque masculino completo (Varón + Colgador + Varón de Espalda + Close-up).",
    badge: "Hombre",
    defaultPoses: ["VARON", "COLGADOR", "VARON_ESPALDA", "CLOSE_UP"],
  },
  {
    id: "MUJER",
    nombre: "🌟 Plantilla Mujer",
    descripcion: "Enfoque femenino completo (Mujer + Colgador + Mujer de Espalda + Close-up).",
    badge: "Mujer",
    defaultPoses: ["MUJER", "COLGADOR", "MUJER_ESPALDA", "CLOSE_UP"],
  },
  {
    id: "POLERA",
    nombre: "🌟 Plantilla Polera",
    descripcion: "Catálogo urbano de poleras (Varón + Colgador + Maniquí Invisible + Close-up).",
    badge: "Urbano",
    defaultPoses: ["VARON", "COLGADOR", "MANIQUI_INVISIBLE", "CLOSE_UP"],
  },
  {
    id: "MANUAL",
    nombre: "🌟 Modo Manual",
    descripcion: "Tú eliges exactamente qué fotos generar de la biblioteca de modelos.",
    badge: "A Medida",
    defaultPoses: ["VARON", "MUJER", "COLGADOR", "CLOSE_UP"],
  },
];

/**
 * Resuelve las poses finales según la plantilla seleccionada y el índice de la variante
 * aplicando la alternación estricta solicitada por el usuario.
 */
export function resolvePosesForTemplate(
  templateId: PlantillaGeneracionId,
  variantIndex: number = 0,
  customPoses?: TipoModeloBase[]
): TipoModeloBase[] {
  if (templateId === "MANUAL" && customPoses && customPoses.length > 0) {
    return customPoses;
  }

  const isEvenVariant = variantIndex % 2 === 1; // 0=primera variante, 1=segunda variante, etc.

  switch (templateId) {
    case "UNISEX_ADULTO":
      // v1: Varón + Colgador + Mujer + Close-up
      // v2: Mujer + Colgador + Varón + Close-up
      return isEvenVariant
        ? ["MUJER", "COLGADOR", "VARON", "CLOSE_UP"]
        : ["VARON", "COLGADOR", "MUJER", "CLOSE_UP"];

    case "TRADICIONAL_POLLERA":
      // v1: Mujer de Pollera + Colgador + Mujer + Close-up
      // v2: Mujer + Colgador + Mujer de Pollera + Close-up
      return isEvenVariant
        ? ["MUJER", "COLGADOR", "MUJER_POLLERA", "CLOSE_UP"]
        : ["MUJER_POLLERA", "COLGADOR", "MUJER", "CLOSE_UP"];

    case "INFANTIL":
      return ["NINO", "COLGADOR", "CLOSE_UP"];

    case "FAMILIAR":
      return ["VARON", "COLGADOR", "MUJER", "NINO"];

    case "VARON":
      return ["VARON", "COLGADOR", "VARON_ESPALDA", "CLOSE_UP"];

    case "MUJER":
      return ["MUJER", "COLGADOR", "MUJER_ESPALDA", "CLOSE_UP"];

    case "POLERA":
      return ["VARON", "COLGADOR", "MANIQUI_INVISIBLE", "CLOSE_UP"];

    case "MANUAL":
    default:
      return customPoses && customPoses.length > 0
        ? customPoses
        : ["VARON", "COLGADOR", "MUJER", "CLOSE_UP"];
  }
}

