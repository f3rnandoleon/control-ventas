export interface MedidasPrenda {
  anchoPecho?: number;       // Ancho de pecho (axila a axila) en cm
  anchoHombros?: number;     // Ancho de hombros en cm
  largoTotal?: number;       // Largo total en cm
  largoMangaAxila?: number;  // Largo de manga (axila a manga) en cm
  largoMangaHombro?: number; // Largo de manga (hombro a manga) en cm
}

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
  precioVenta?: number;      // Opcional: sobreescribe Producto.precioVenta si se define
  precioCosto?: number;      // Opcional: sobreescribe Producto.precioCosto si se define
  medidas?: MedidasPrenda;   // Opcional: medidas en cm
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
  costoOrigen?: {
    moneda: "PEN" | "BOB" | "USD";
    montoOriginal: number;
    tipoCambioAplicado: number;
    fechaRegistro?: string | Date;
  };
  estado?: "ACTIVO" | "INACTIVO" | "AGOTADO";
}
