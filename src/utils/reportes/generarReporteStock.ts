import { autoTable } from "jspdf-autotable";
import type { Producto } from "@/types/producto";
import { ESTADO_STOCK_LABELS, getEstadoStock, getStockProducto } from "@/utils/stock";
import { createReportDocument, formatMoney, saveReport } from "./pdfHelpers";

export function generarReporteStockPDF(productos: Producto[]) {
  if (productos.length === 0) return;
  const doc = createReportDocument("Reporte general de stock");
  autoTable(doc, {
    startY: 28,
    head: [["Nombre", "Modelo", "SKU", "Categoría", "Precio venta", "Físico", "Reservado", "Disponible", "Estado"]],
    body: productos.map((producto) => {
      const stock = getStockProducto(producto);
      return [producto.nombre, producto.modelo, producto.sku, producto.categoria || "Sin categoría",
        formatMoney(producto.precioVenta), stock.fisico, stock.reservado, stock.disponible,
        ESTADO_STOCK_LABELS[getEstadoStock(stock.disponible, producto.stockMinimo)]];
    }),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [3, 105, 161] },
    margin: { left: 14, right: 14, bottom: 14 },
  });
  saveReport(doc, `reporte-stock-${new Date().toISOString().slice(0, 10)}.pdf`);
}
