import { normalizarTexto } from "./normalizar";

export function generarCodigoVariante({
  sku,
  color,
  colorSecundario,
  talla,
  correlativo,
}: {
  sku: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  correlativo: number;
}) {
  const c = [color, colorSecundario]
    .filter(Boolean)
    .map((value) => normalizarTexto(value as string))
    .join("-");
  const t = normalizarTexto(talla);

  const correlativoStr = correlativo.toString().padStart(3, "0");

  const codigo = `${sku}-${c}-${t}-${correlativoStr}`;

  return {
    codigoBarra: codigo,
    qrCode: codigo, // 👈 luego puedes cambiar a JSON
  };
}
