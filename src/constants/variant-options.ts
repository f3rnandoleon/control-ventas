export type ColorOption = {
  value: string;
  label: string;
  hex: string;
  family?: string;
};

// Catálogo ordenado por familias tonales (de claros/neutros a cromáticos y metálicos)
const COLOR_DEFINITIONS: [string, string, string][] = [
  // 1. Blancos & Hueso
  ["Blanco", "#FFFFFF", "Blancos & Hueso"],
  ["Blanco Roto / Crudo", "#F8F6F0", "Blancos & Hueso"],
  ["Marfil", "#FFFFF0", "Blancos & Hueso"],
  ["Crema", "#FFFDD0", "Blancos & Hueso"],
  ["Hueso", "#E3DAC9", "Blancos & Hueso"],

  // 2. Grises & Negros
  ["Gris Claro", "#D1D5DB", "Grises & Negros"],
  ["Gris", "#6B7280", "Grises & Negros"],
  ["Plomo", "#5A6265", "Grises & Negros"],
  ["Gris Oscuro", "#374151", "Grises & Negros"],
  ["Grafito", "#293133", "Grises & Negros"],
  ["Carbón", "#36454F", "Grises & Negros"],
  ["Negro", "#111827", "Grises & Negros"],

  // 3. Tonos Tierra, Nudes & Marrones
  ["Nude", "#E3BC9A", "Tonos Tierra & Neutros"],
  ["Beige", "#D6C6A5", "Tonos Tierra & Neutros"],
  ["Arena", "#C2B280", "Tonos Tierra & Neutros"],
  ["Khaki", "#BDB76B", "Tonos Tierra & Neutros"],
  ["Camel", "#C19A6B", "Tonos Tierra & Neutros"],
  ["Taupe / Visón", "#8B8589", "Tonos Tierra & Neutros"],
  ["Caramelo", "#AF6E4D", "Tonos Tierra & Neutros"],
  ["Canela", "#8E4A23", "Tonos Tierra & Neutros"],
  ["Tabaco", "#715D47", "Tonos Tierra & Neutros"],
  ["Café", "#6F4E37", "Tonos Tierra & Neutros"],
  ["Marrón", "#7C2D12", "Tonos Tierra & Neutros"],
  ["Chocolate", "#7B3F00", "Tonos Tierra & Neutros"],

  // 4. Azules & Celestes
  ["Celeste", "#7DD3FC", "Azules & Celestes"],
  ["Azul Cielo", "#87CEEB", "Azules & Celestes"],
  ["Turquesa", "#14B8A6", "Azules & Celestes"],
  ["Cian", "#06B6D4", "Azules & Celestes"],
  ["Aguamarina", "#7FFFD4", "Azules & Celestes"],
  ["Denim / Jeans", "#4B6B94", "Azules & Celestes"],
  ["Azul Acero", "#4682B4", "Azules & Celestes"],
  ["Azul", "#2563EB", "Azules & Celestes"],
  ["Azul Rey", "#1D4ED8", "Azules & Celestes"],
  ["Azul Eléctrico", "#0055FF", "Azules & Celestes"],
  ["Índigo", "#4F46E5", "Azules & Celestes"],
  ["Azul Marino", "#172554", "Azules & Celestes"],
  ["Azul Noche", "#0C192C", "Azules & Celestes"],
  ["Petróleo", "#006D77", "Azules & Celestes"],

  // 5. Verdes
  ["Menta", "#98FF98", "Verdes"],
  ["Verde Sage / Salvia", "#9CAF88", "Verdes"],
  ["Verde Manzana", "#8DB600", "Verdes"],
  ["Verde Lima", "#A7F432", "Verdes"],
  ["Verde Neón", "#39FF14", "Verdes"],
  ["Verde", "#16A34A", "Verdes"],
  ["Verde Esmeralda", "#059669", "Verdes"],
  ["Verde Oliva", "#6B7D3E", "Verdes"],
  ["Verde Musgo", "#5A6B3A", "Verdes"],
  ["Verde Militar", "#4B5320", "Verdes"],
  ["Verde Pino", "#1B4D3E", "Verdes"],
  ["Verde Botella", "#004225", "Verdes"],

  // 6. Amarillos, Ocre & Mostaza
  ["Amarillo Pastel", "#FFF5BA", "Amarillos & Mostaza"],
  ["Amarillo", "#FACC15", "Amarillos & Mostaza"],
  ["Amarillo Canario", "#FFEF00", "Amarillos & Mostaza"],
  ["Mostaza", "#CA8A04", "Amarillos & Mostaza"],
  ["Ocre", "#CC7722", "Amarillos & Mostaza"],
  ["Ámbar", "#FFBF00", "Amarillos & Mostaza"],

  // 7. Naranjas & Terracotas
  ["Melocotón / Peach", "#FFE5B4", "Naranjas & Terracotas"],
  ["Salmón", "#FA8072", "Naranjas & Terracotas"],
  ["Coral", "#FF7F50", "Naranjas & Terracotas"],
  ["Mandarina", "#FF8800", "Naranjas & Terracotas"],
  ["Naranja", "#F97316", "Naranjas & Terracotas"],
  ["Terracota", "#C65D3B", "Naranjas & Terracotas"],
  ["Ladrillo", "#B7410E", "Naranjas & Terracotas"],

  // 8. Rojos, Granates & Vinos
  ["Escarlata", "#FF2400", "Rojos & Vinos"],
  ["Rojo", "#DC2626", "Rojos & Vinos"],
  ["Carmesí", "#DC143C", "Rojos & Vinos"],
  ["Cereza", "#D2042D", "Rojos & Vinos"],
  ["Rubí", "#9B111E", "Rojos & Vinos"],
  ["Granate", "#6A0C14", "Rojos & Vinos"],
  ["Amaranto", "#9F1239", "Rojos & Vinos"],
  ["Vino", "#722F37", "Rojos & Vinos"],
  ["Burdeos", "#800020", "Rojos & Vinos"],

  // 9. Rosas, Corales & Fucsias
  ["Rosa Pastel / Bebé", "#FADADD", "Rosas & Fucsias"],
  ["Rosa", "#F472B6", "Rosas & Fucsias"],
  ["Rosa Viejo", "#D4A5A5", "Rosas & Fucsias"],
  ["Palo de Rosa", "#C08081", "Rosas & Fucsias"],
  ["Chicle", "#FF6EC7", "Rosas & Fucsias"],
  ["Fucsia", "#FF00FF", "Rosas & Fucsias"],
  ["Fucsia Neón", "#FF1493", "Rosas & Fucsias"],
  ["Magenta", "#D946EF", "Rosas & Fucsias"],

  // 10. Morados, Lilas & Violetas
  ["Lavanda", "#E6E6FA", "Morados & Violetas"],
  ["Lila", "#C4B5FD", "Morados & Violetas"],
  ["Violeta", "#7F00FF", "Morados & Violetas"],
  ["Morado", "#7E22CE", "Morados & Violetas"],
  ["Púrpura", "#9333EA", "Morados & Violetas"],
  ["Ciruela", "#8E4585", "Morados & Violetas"],
  ["Berenjena", "#3B1E38", "Morados & Violetas"],

  // 11. Metálicos & Brillos
  ["Champaña / Champagne", "#F7E7CE", "Metálicos & Brillos"],
  ["Plateado", "#C0C0C0", "Metálicos & Brillos"],
  ["Dorado", "#D4AF37", "Metálicos & Brillos"],
  ["Oro Rosa / Rose Gold", "#B76E79", "Metálicos & Brillos"],
  ["Bronce", "#CD7F32", "Metálicos & Brillos"],
  ["Cobre", "#B87333", "Metálicos & Brillos"],
];

export const COLOR_OPTIONS: ColorOption[] = COLOR_DEFINITIONS.map(
  ([value, hex, family]) => ({
    value,
    label: value,
    hex,
    family,
  })
);

export const TALLA_OPTIONS = [
  "2",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
] as const;

export const getVariantSelectOptions = (
  currentValue: string,
  baseOptions: readonly string[]
) => {
  if (!currentValue || baseOptions.includes(currentValue)) return [...baseOptions];
  return [currentValue, ...baseOptions];
};

export const getColorOptions = (currentValue: string) => {
  if (!currentValue || COLOR_OPTIONS.some((option) => option.value.toLowerCase() === currentValue.toLowerCase())) {
    return COLOR_OPTIONS;
  }
  return [
    { value: currentValue, label: currentValue, hex: getColorHex(currentValue) || "#6B7280", family: "Personalizado" },
    ...COLOR_OPTIONS,
  ];
};

export const getColorHex = (colorName: string): string | undefined => {
  if (!colorName) return undefined;
  const normalized = colorName.trim().toLowerCase();

  // Búsqueda directa por valor exacto
  const exactMatch = COLOR_OPTIONS.find(
    (option) => option.value.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch.hex;

  // Búsqueda por alias compuestos con '/' (ej. "Crudo" en "Blanco Roto / Crudo", "Jeans" en "Denim / Jeans")
  const aliasMatch = COLOR_OPTIONS.find((option) => {
    const valLower = option.value.toLowerCase();
    if (valLower.includes("/")) {
      const parts = valLower.split("/").map((p) => p.trim());
      return parts.includes(normalized);
    }
    return false;
  });

  return aliasMatch?.hex;
};

export type VarianteColorOption = (typeof COLOR_OPTIONS)[number]["value"];
export type VarianteTallaOption = (typeof TALLA_OPTIONS)[number];
