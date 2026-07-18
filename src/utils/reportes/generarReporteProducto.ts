import { autoTable } from "jspdf-autotable";
import type { Producto } from "@/types/producto";
import { ESTADO_STOCK_LABELS, getEstadoStock, getStockDisponibleVariante, getStockFisicoVariante, getStockReservadoVariante } from "@/utils/stock";
import { createReportDocument, formatMoney, saveReport } from "./pdfHelpers";

export function generarReporteProductoPDF(producto: Producto) {
  const doc = createReportDocument(`Stock del producto: ${producto.nombre}`);
  doc.setFontSize(10);
  doc.text(`Modelo: ${producto.modelo} | SKU: ${producto.sku} | Categoría: ${producto.categoria || "Sin categoría"}`, 14, 29);
  doc.text(`Precio venta: ${formatMoney(producto.precioVenta)} | Precio costo: ${formatMoney(producto.precioCosto)}`, 14, 35);
  autoTable(doc, {
    startY: 41,
    head: [["Color", "Color secundario", "Talla", "Físico", "Reservado", "Disponible", "Estado"]],
    body: producto.variantes.map((variante) => {
      const disponible = getStockDisponibleVariante(variante);
      return [variante.color, variante.colorSecundario || "—", variante.talla,
        getStockFisicoVariante(variante), getStockReservadoVariante(variante), disponible,
        ESTADO_STOCK_LABELS[getEstadoStock(disponible, producto.stockMinimo)]];
    }),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [3, 105, 161] },
    margin: { left: 14, right: 14, bottom: 14 },
  });
  saveReport(doc, `stock-${producto.sku || producto._id}.pdf`);
}
