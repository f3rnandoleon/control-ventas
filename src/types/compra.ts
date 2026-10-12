export interface CompraItemInput {
  productoId: string;
  varianteId: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  cantidad: number;
  costoUnitarioOrigen: number; // en la moneda de origen (ej: PEN)
  costoUnitarioBOB?: number;   // en BOB (calculado con tipoCambio si moneda es PEN/USD)
}

export interface CompraItem {
  productoId: string;
  varianteId: string;
  productoSnapshot: {
    nombre: string;
    modelo?: string;
    sku: string;
  };
  varianteSnapshot: {
    color: string;
    colorSecundario?: string;
    talla: string;
    codigoBarra?: string;
  };
  cantidad: number;
  costoUnitarioOrigen: number;
  costoUnitarioBOB: number;
  totalLineaBOB: number;
  stockAnterior: number;
  costoAnteriorBOB: number;
  nuevoStock: number;
  nuevoCostoPromedioBOB: number;
}

export interface Compra {
  _id: string;
  numeroCompra: string;
  fecha: string | Date;
  proveedor?: string;
  comprobanteReferencia?: string;
  monedaOrigen: "PEN" | "BOB" | "USD";
  tipoCambio: number;
  totalMonedaOrigen: number;
  totalBOB: number;
  items: CompraItem[];
  notas?: string;
  creadoPor?: {
    _id: string;
    nombreCompleto: string;
    email: string;
  } | string;
  createdAt: string;
  updatedAt: string;
}

export interface CrearCompraInput {
  fecha?: string | Date;
  proveedor?: string;
  comprobanteReferencia?: string;
  monedaOrigen: "PEN" | "BOB" | "USD";
  tipoCambio: number;
  notas?: string;
  items: CompraItemInput[];
}
