import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

type VarianteBarra = {
  codigo: string;
};

export function generarPDFCodigosBarras(
  variantes: VarianteBarra[],
  titulo = "Códigos de barras"
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  let x = 20;
  let y = 30;

  const barcodeWidth = 50;
  const barcodeHeight = 18;
  const marginX = 70;
  const marginY = 45;

  doc.setFontSize(14);
  doc.text(titulo, pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(9);

  variantes.forEach((v, index) => {
    // Texto encima
    doc.text(v.codigo, x, y - 4);

    // Crear canvas para el código de barras
    const canvas = document.createElement("canvas");

    JsBarcode(canvas, v.codigo, {
      format: "CODE128",
      displayValue: false,
      height: 40,
      margin: 0,
    });

    const imgData = canvas.toDataURL("image/png");

    doc.addImage(
      imgData,
      "PNG",
      x,
      y,
      barcodeWidth,
      barcodeHeight
    );

    x += marginX;

    // Salto de fila
    if (x + barcodeWidth > pageWidth - 20) {
      x = 20;
      y += marginY;
    }

    // Nueva página
    if (y + barcodeHeight > 270) {
      doc.addPage();
      x = 20;
      y = 30;
    }
  });

  doc.save("codigos-barras-variantes.pdf");
}
