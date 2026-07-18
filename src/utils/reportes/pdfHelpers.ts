import jsPDF from "jspdf";

export const formatMoney = (value: number) => `Bs ${Number(value || 0).toFixed(2)}`;

export function createReportDocument(title: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-BO")}`, 14, 22);
  return doc;
}

export function saveReport(doc: jsPDF, filename: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.text(
      `Página ${page} de ${pages}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 7,
      { align: "right" }
    );
  }
  doc.save(filename);
}
