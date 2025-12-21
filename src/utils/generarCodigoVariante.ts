import { normalizarTexto } from "./normalizar";

export function generarCodigoVariante({
  sku,
  color,
  talla,
  correlativo,
}: {
  sku: string;
  color: string;
  talla: string;
  correlativo: number;
}) {
  const c = normalizarTexto(color);
  const t = normalizarTexto(talla);

  const correlativoStr = correlativo.toString().padStart(3, "0");

  const codigo = `${sku}-${c}-${t}-${correlativoStr}`;

  return {
    codigoBarra: codigo,
    qrCode: codigo, // 👈 luego puedes cambiar a JSON
  };
}
