export interface VentaItem {
  productoId: {
    _id: string;
    nombre?: string;
    modelo?: string;
  } | string;

  variante: {
    variantId?: string;
    color: string;
    colorSecundario?: string;
    talla: string;
    codigoBarra?: string;
    qrCode?: string;
  };

  productoSnapshot?: {
    nombre: string;
    modelo?: string;
    sku?: string;
    imagen?: string;
  };

  cantidad: number;
  precioUnitario: number;
  precioCosto: number;
  ganancia: number;
}

export interface Venta {
  _id: string;
  numeroVenta: string;

  items: VentaItem[];

  subtotal: number;
  descuento: number;
  total: number;
  gananciaTotal: number;

  metodoPago: "EFECTIVO" | "QR";
  tipoVenta: "WEB" | "APP_QR" | "TIENDA";
  estado: "PAGADA" | "PENDIENTE" | "CANCELADA";

  createdAt: string;

  vendedor?: {
    _id: string;
    fullname: string;
    email: string;
  };
}
export interface VentaFormItem {
  productoId: string;
  productoNombre?: string;
  variantId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  stockDisponible: number;
  cantidad: number;
}
export interface CreateVentaItemDTO {
  productoId: string;
  variantId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  cantidad: number;
}

export interface CreateVentaDTO {
  items: CreateVentaItemDTO[];
  metodoPago: "EFECTIVO" | "QR";
  tipoVenta: "WEB" | "APP_QR" | "TIENDA";
}
