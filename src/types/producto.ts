export interface Variante {
  color: string;
  talla: string;
  stock: number;
  codigoBarra?: string;
  qrCode?: string;
}

export interface Producto {
  _id: string;
  nombre: string;
  modelo: string;
  sku: string; 
  precioVenta: number;
  precioCosto: number;
  totalVendidos: number;
  variantes: Variante[];
}
