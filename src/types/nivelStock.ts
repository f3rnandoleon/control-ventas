export interface NivelStock {
  _id: string;
  sucursalId: string;
  productoId: string;
  varianteId: string;
  stockFisico: number;
  stockReservado: number;
  stockMinimo: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NivelStockConDetalles extends NivelStock {
  sucursal?: {
    _id: string;
    nombre: string;
    codigo: string;
    tipo: string;
  };
  producto?: {
    _id: string;
    nombre: string;
    modelo?: string;
    sku: string;
    precioVenta: number;
    precioCosto: number;
  };
  variante?: {
    varianteId: string;
    color: string;
    colorSecundario?: string;
    talla: string;
    codigoBarra?: string;
    imagenes?: string[];
  };
}

export type ActualizarNivelStockDTO = {
  sucursalId: string;
  productoId: string;
  varianteId: string;
  stockFisico?: number;
  stockReservado?: number;
  stockMinimo?: number;
};
