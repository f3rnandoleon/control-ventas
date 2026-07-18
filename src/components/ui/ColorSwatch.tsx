import { getColorHex } from "@/constants/variant-options";

export default function ColorSwatch({
  colorName,
  size = "md",
  shape = "circle",
}: {
  colorName: string;
  size?: "sm" | "md";
  shape?: "circle" | "square";
}) {
  const hex = getColorHex(colorName);
  const dimensions = size === "sm" ? "h-6 w-6 text-[10px]" : "h-10 w-10 text-xs";
  const radius = shape === "circle" ? "rounded-full" : "rounded-lg";
  const label = colorName ? `Color ${colorName}` : "Color no seleccionado";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center border border-slate-400/60 font-bold text-white shadow-sm ${dimensions} ${radius}`}
      style={{ backgroundColor: hex ?? "#6B7280" }}
    >
      {!hex && colorName ? "?" : ""}
    </span>
  );
}
