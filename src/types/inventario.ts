import type { Producto } from "./producto";
export interface InventarioItem {
  _id: string;

  productoId: {
    _id: string;
    nombre: string;
    modelo?: string;
  };

  variante: {
    color: string;
    talla: string;
  };

  tipo: "ENTRADA" | "SALIDA" | "AJUSTE" | "DEVOLUCION";
  cantidad: number;

  stockAnterior: number;
  stockActual: number;

  motivo?: string;
  referencia?: string;

  usuario?: {
    fullname: string;
    email: string;
  };

  createdAt: string;
}
export interface ProductoInventario extends Producto {
  stockTotal: number;
  stockMinimo: number;
}