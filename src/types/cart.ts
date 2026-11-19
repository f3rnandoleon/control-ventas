import type { PromocionAplicadaSnapshot } from "@/types/promocion";

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
  precioUnitarioLista?: number;
  tieneRebaja?: boolean;
  porcentajeDescuento?: number;
  cantidad: number;
  subtotal: number;
}

export interface CartPricingSummary {
  subtotalLista: number;
  subtotalPostCatalogo: number;
  descuentoCatalogo: number;
  descuentoPromociones: number;
  descuentoTotal: number;
  totalEstimado: number;
  promocionesAplicadas: PromocionAplicadaSnapshot[];
  cuponCodigo: string | null;
  cuponValido: boolean;
  cuponErrorCodigo?: string | null;
  cuponErrorMensaje?: string | null;
}

export interface Cart {
  _id: string;
  cliente: string;
  items: CartItem[];
  totalArticulos: number;
  subtotal: number;
  cuponCodigo?: string | null;
  resumenPrecios?: CartPricingSummary;
  createdAt: string;
  updatedAt: string;
}
