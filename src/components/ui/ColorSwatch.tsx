import { getColorHex } from "@/constants/variant-options";

export default function ColorSwatch({
  colorName,
  size = "md",
  shape = "circle",
  className = "",
}: {
  colorName: string;
  size?: "xs" | "sm" | "md";
  shape?: "circle" | "square";
  className?: string;
}) {
  const hex = getColorHex(colorName);
  const dimensions =
    size === "xs"
      ? "h-3.5 w-3.5 text-[8px]"
      : size === "sm"
      ? "h-5 w-5 text-[10px]"
      : "h-8 w-8 text-xs";
  const radius = shape === "circle" ? "rounded-full" : "rounded-lg";
  const label = colorName ? `Color ${colorName}` : "Color no seleccionado";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center border border-slate-400/40 font-bold text-white shadow-sm ${dimensions} ${radius} ${className}`}
      style={{ backgroundColor: hex ?? "#6B7280" }}
    >
      {!hex && colorName ? "?" : ""}
    </span>
  );
}
