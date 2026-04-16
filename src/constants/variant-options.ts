export const COLOR_OPTIONS = [
  "Negro",
  "Blanco",
  "Gris",
  "Gris Claro",
  "Gris Oscuro",
  "Azul",
  "Azul Marino",
  "Azul Rey",
  "Celeste",
  "Turquesa",
  "Verde",
  "Verde Oliva",
  "Verde Esmeralda",
  "Verde Militar",
  "Amarillo",
  "Mostaza",
  "Naranja",
  "Rojo",
  "Vino",
  "Amaranto",
  "Carmesi",
  "Burdeos",
  "Palo de Rosa",
  "Rosa",
  "Magenta",
  "Fucsia",
  "Morado",
  "Lila",
  "Purpura",
  "Beige",
  "Crema",
  "Marron",
  "Cafe",
  "Camel",
  "Khaki",
  "Dorado",
  "Plateado",
  "Coral",
] as const;

export const TALLA_OPTIONS = ["S", "M", "L", "XL"] as const;

export const getVariantSelectOptions = (
  currentValue: string,
  baseOptions: readonly string[]
) => {
  if (!currentValue || baseOptions.includes(currentValue)) {
    return [...baseOptions];
  }

  return [currentValue, ...baseOptions];
};

export type VarianteColorOption = (typeof COLOR_OPTIONS)[number];
export type VarianteTallaOption = (typeof TALLA_OPTIONS)[number];
