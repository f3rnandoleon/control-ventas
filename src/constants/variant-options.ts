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
  "Verde Militar",
  "Amarillo",
  "Mostaza",
  "Naranja",
  "Rojo",
  "Vino",
  "Burdeos",
  "Rosa",
  "Fucsia",
  "Morado",
  "Lila",
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
