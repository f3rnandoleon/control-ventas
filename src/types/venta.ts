export interface VentaItem {
  productoId: {
    _id: string;
    nombre?: string;
    modelo?: string;
  } | string;

  variante: {
    color: string;
    talla: string;
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
    fullname: string;
    email: string;
  };
}
