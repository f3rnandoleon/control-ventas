export interface Variante {
  varianteId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  stock: number;
  stockReservado?: number;
  stockDisponible?: number;
  imagenes?: string[];
  imagen?: string;
  descripcion?: string;
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
  categoria?: string;
  variantes: Variante[];
  stockTotal?: number;
  stockReservadoTotal?: number;
  stockDisponible?: number;
  stockMinimo?: number;
  estado?: "ACTIVO" | "INACTIVO" | "AGOTADO";
}
