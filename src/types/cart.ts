export interface CartItem {
  _id: string;
  productoId: string;
  variante: {
    variantId?: string;
    color: string;
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
  customer: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}
