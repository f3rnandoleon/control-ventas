export const estadoTraspasoValues = [
  "SOLICITADA",
  "EN_TRANSITO",
  "RECIBIDA",
  "CANCELADA",
] as const;

export type EstadoTraspaso = (typeof estadoTraspasoValues)[number];

export interface TraspasoItem {
  productoId: string;
  varianteId: string;
  productoSnapshot: {
    nombre: string;
    sku: string;
    modelo?: string;
  };
  varianteSnapshot: {
    color: string;
    colorSecundario?: string;
    talla: string;
    codigoBarra?: string;
    imagen?: string;
  };
  cantidadEnviada: number;
  cantidadRecibida?: number;
  costoUnitarioCPP: number;
  notasItem?: string;
}

export interface Traspaso {
  _id: string;
  numeroTraspaso: string;
  sucursalOrigenId: string | { _id: string; nombre: string; codigo: string };
  sucursalDestinoId: string | { _id: string; nombre: string; codigo: string };
  estado: EstadoTraspaso;
  items: TraspasoItem[];
  totalPrendasEnviadas: number;
  totalPrendasRecibidas?: number;
  valorTotalCostoTraspaso: number;
  solicitadoPor: { _id: string; nombreCompleto: string; email: string } | string;
  despachadoPor?: { _id: string; nombreCompleto: string; email: string } | string | null;
  recibidoPor?: { _id: string; nombreCompleto: string; email: string } | string | null;
  fechaDespacho?: string | null;
  fechaRecepcion?: string | null;
  motivo: string;
  notas?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CrearTraspasoInput = {
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  motivo?: string;
  notas?: string;
  items: Array<{
    productoId: string;
    varianteId: string;
    cantidad: number;
    notasItem?: string;
  }>;
};

export type DespacharTraspasoInput = {
  traspasoId: string;
  notas?: string;
};

export type RecibirTraspasoInput = {
  traspasoId: string;
  itemsRecibidos?: Array<{
    varianteId: string;
    cantidadRecibida: number;
  }>;
  notas?: string;
};
