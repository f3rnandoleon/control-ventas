import JsBarcode from "jsbarcode";

export function generarCodigoBarraImagen(codigo: string): string {
  const canvas = document.createElement("canvas");

  JsBarcode(canvas, codigo, {
    format: "CODE128",
    displayValue: true,
    fontSize: 14,
    height: 80,
    margin: 10,
  });

  return canvas.toDataURL("image/png");
}
