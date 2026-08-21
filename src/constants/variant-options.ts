export type ColorOption = {
  value: string;
  label: string;
  hex: string;
};

export const COLOR_OPTIONS = [
  ["Negro", "#111827"], ["Blanco", "#FFFFFF"], ["Gris", "#6B7280"],
  ["Gris Claro", "#D1D5DB"], ["Gris Oscuro", "#374151"], ["Azul", "#2563EB"],
  ["Azul Marino", "#172554"], ["Azul Rey", "#1D4ED8"], ["Celeste", "#7DD3FC"],
  ["Turquesa", "#14B8A6"], ["Verde", "#16A34A"], ["Verde Oliva", "#6B7D3E"],
  ["Verde Esmeralda", "#059669"], ["Verde Militar", "#4B5320"], ["Amarillo", "#FACC15"],
  ["Mostaza", "#CA8A04"], ["Naranja", "#F97316"], ["Rojo", "#DC2626"],
  ["Vino", "#722F37"], ["Amaranto", "#9F1239"], ["Carmesí", "#DC143C"],
  ["Burdeos", "#800020"], ["Palo de Rosa", "#C08081"], ["Rosa", "#F472B6"],
  ["Magenta", "#D946EF"], ["Fucsia", "#FF00FF"], ["Morado", "#7E22CE"],
  ["Lila", "#C4B5FD"], ["Púrpura", "#9333EA"], ["Beige", "#D6C6A5"],
  ["Crema", "#FFFDD0"], ["Marrón", "#7C2D12"], ["Café", "#6F4E37"],
  ["Camel", "#C19A6B"], ["Khaki", "#BDB76B"], ["Dorado", "#D4AF37"],
  ["Plateado", "#C0C0C0"], ["Coral", "#FF7F50"], ["Terracota", "#C65D3B"],
  ["Lavanda", "#C4B5FD"], ["Salmón", "#FA8072"], ["Aguamarina", "#7FFFD4"],
  ["Menta", "#98FF98"], ["Carbón", "#36454F"], ["Marfil", "#FFFFF0"],
  ["Índigo", "#4F46E5"], ["Cian", "#06B6D4"], ["Bronce", "#CD7F32"],
  ["Cobre", "#B87333"], ["Hueso", "#E3DAC9"], ["Chocolate", "#7B3F00"],
  ["Cereza", "#D2042D"], ["Ciruela", "#8E4585"], ["Petróleo", "#006D77"],
  ["Arena", "#C2B280"], ["Ámbar", "#FFBF00"],
] .map(([value, hex]) => ({ value, label: value, hex })) as ColorOption[];

export const TALLA_OPTIONS = ["S", "M", "L", "XL","XXL"] as const;

export const getVariantSelectOptions = (
  currentValue: string,
  baseOptions: readonly string[]
) => {
  if (!currentValue || baseOptions.includes(currentValue)) return [...baseOptions];
  return [currentValue, ...baseOptions];
};

export const getColorOptions = (currentValue: string) => {
  if (!currentValue || COLOR_OPTIONS.some((option) => option.value === currentValue)) {
    return COLOR_OPTIONS;
  }
  return [{ value: currentValue, label: currentValue, hex: "#6B7280" }, ...COLOR_OPTIONS];
};

export const getColorHex = (colorName: string) =>
  COLOR_OPTIONS.find((option) => option.value === colorName)?.hex;

export type VarianteColorOption = (typeof COLOR_OPTIONS)[number]["value"];
export type VarianteTallaOption = (typeof TALLA_OPTIONS)[number];
