import jsPDF from "jspdf";
import QRCode from "qrcode";

type VarianteQR = {
  codigo: string;
};

export async function generarPDFQrs(
  variantes: VarianteQR[],
  titulo = "QR Variantes"
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let x = 20;
  let y = 30;

  const qrSize = 40;
  const marginX = 60;
  const marginY = 60;

  doc.setFontSize(14);
  doc.text(titulo, pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(9);

  for (let i = 0; i < variantes.length; i++) {
    const { codigo } = variantes[i];

    const qrDataUrl = await QRCode.toDataURL(codigo);

    // Texto encima del QR
    doc.text(codigo, x, y - 5);

    // QR
    doc.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);

    x += marginX;

    // Salto de fila
    if (x + qrSize > pageWidth - 20) {
      x = 20;
      y += marginY;
    }

    // Nueva página
    if (y + qrSize > 270) {
      doc.addPage();
      x = 20;
      y = 30;
    }
  }

  doc.save("qr-variantes.pdf");
}
