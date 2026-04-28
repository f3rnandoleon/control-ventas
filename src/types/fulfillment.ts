export type EstadoEntrega =
  | "PENDING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "NOT_APPLICABLE"
  | "CANCELLED";

export type MetodoEntrega =
  | "WHATSAPP"
  | "PICKUP_POINT"
  | "SHIPPING_NATIONAL"
  | null;

export interface Entrega {
  _id: string;
  pedidoId: string;
  numeroPedido: string;
  cliente?: string | null;
  vendedor?: string | null;
  canal: "WEB" | "APP_QR" | "TIENDA";
  metodo: MetodoEntrega;
  estado: EstadoEntrega;
  puntoRecojo?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  nombreDestinatario?: string | null;
  codigoSeguimiento?: string | null;
  nombreTransportista?: string | null;
  asignadoA?: string | null;
  notas?: string | null;
  preparadoEn?: string | null;
  enTransitoEn?: string | null;
  entregadoEn?: string | null;
  canceladoEn?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrearEntregaDTO {
  pedidoId: string;
  codigoSeguimiento?: string | null;
  nombreTransportista?: string | null;
  asignadoA?: string | null;
  notas?: string | null;
}

export interface ActualizarEstadoEntregaDTO {
  estado: EstadoEntrega;
  codigoSeguimiento?: string | null;
  nombreTransportista?: string | null;
  asignadoA?: string | null;
  notas?: string | null;
}
