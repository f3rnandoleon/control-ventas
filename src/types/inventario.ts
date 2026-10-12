import type { Producto } from "./producto";

export interface InventarioItem {
  _id: string;

  productoId: {
    _id: string;
    nombre: string;
    modelo?: string;
  } | null;

  variante: {
    varianteId?: string;
    color: string;
    colorSecundario?: string;
    talla: string;
    codigoBarra?: string;
  };

  sucursalId?: {
    _id: string;
    nombre: string;
    codigo: string;
  } | string | null;

  productoSnapshot?: {
    nombre?: string;
    modelo?: string;
    sku?: string;
  };

  tipo:
    | "ENTRADA"
    | "SALIDA"
    | "AJUSTE"
    | "DEVOLUCION"
    | "TRASPASO_SALIDA"
    | "TRASPASO_ENTRADA";
  cantidad: number;

  stockAnterior: number;
  stockActual: number;

  // Campos contables / Kardex valorado
  costoUnitario?: number;
  valorTotalOperacion?: number;
  costoPromedioResultante?: number;
  saldoValorado?: number;
  compraId?: string;

  motivo?: string;
  referencia?: string;

  usuario?: {
    nombreCompleto: string;
    email: string;
  };

  createdAt: string;
}

export interface ProductoInventario extends Producto {
  stockTotal: number;
  stockMinimo: number;
}

export interface KardexConsolidadoVariante {
  varianteId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  stock: number;
  precioCosto: number;
  precioVenta: number;
  valorTotalCosto: number;
  valorTotalVenta: number;
}

export interface KardexConsolidadoProducto {
  productoId: string;
  nombre: string;
  modelo: string;
  sku: string;
  categoria?: string;
  stockTotal: number;
  costoPromedioPonderado: number;
  precioVentaPromedio: number;
  valorTotalInventarioCosto: number;
  valorTotalInventarioVenta: number;
  margenBrutoEstimadoPorcentaje: number;
  margenBrutoEstimadoMonto: number;
  variantes: KardexConsolidadoVariante[];
}

export interface KardexConsolidadoResumen {
  totalProductos: number;
  totalVariantes: number;
  totalPrendasFisicas: number;
  capitalTotalInvertidoCosto: number;
  valorTotalPotencialVenta: number;
  margenBrutoGlobalPorcentaje: number;
  margenBrutoGlobalMonto: number;
  productos: KardexConsolidadoProducto[];
}

export interface KardexMovimiento {
  _id: string;
  fecha: string;
  tipo:
    | "ENTRADA"
    | "SALIDA"
    | "AJUSTE"
    | "DEVOLUCION"
    | "TRASPASO_SALIDA"
    | "TRASPASO_ENTRADA";
  sucursal?: string;
  referencia?: string;
  motivo?: string;
  usuario?: string;
  variante: {
    color: string;
    talla: string;
  };
  // Físico
  entradaCantidad: number;
  salidaCantidad: number;
  saldoCantidad: number;
  // Valorado
  costoUnitario: number;
  debe: number;   // Entradas valoradas en Bs
  haber: number;  // Salidas valoradas en Bs
  saldoValorado: number;
  costoPromedio: number;
}
