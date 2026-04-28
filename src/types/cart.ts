export interface CartItem {
  _id: string;
  productoId: string;
  variante: {
    varianteId?: string;
    color: string;
    colorSecundario?: string;
    talla: string;
    codigoBarra?: string;
    qrCode?: string;
  };
  productoSnapshot: {
    nombre: string;
    modelo?: string;
    sku?: string;
    imagen?: string;
  };
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Cart {
  _id: string;
  cliente: string;
  items: CartItem[];
  totalArticulos: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}
