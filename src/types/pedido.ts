export type CanalPedido = "WEB" | "APP_QR" | "TIENDA";
export type EstadoPedido =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";
export type EstadoPago = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type EstadoEntrega =
  | "PENDING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "NOT_APPLICABLE"
  | "CANCELLED";
export type EstadoReservaStock =
  | "NONE"
  | "RESERVED"
  | "CONSUMED"
  | "RELEASED";

export interface PedidoItem {
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
  cantidad: number;
  precioUnitario: number;
  totalLinea: number;
  precioCosto: number;
  ganancia: number;
}

export interface Pedido {
  _id: string;
  numeroPedido: string;
  canal: CanalPedido;
  estadoPedido: EstadoPedido;
  estadoPago: EstadoPago;
  estadoEntrega: EstadoEntrega;
  estadoReservaStock: EstadoReservaStock;
  metodoPago: "EFECTIVO" | "QR";
  subtotal: number;
  descuento: number;
  total: number;
  gananciaTotal: number;
  items: PedidoItem[];
  snapshotEntrega?: {
    metodo: "WHATSAPP" | "PICKUP_POINT" | "SHIPPING_NATIONAL";
    puntoRecojo?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    nombreDestinatario?: string | null;
    programadoPara?: string | null;
    departamento?: string | null;
    ciudad?: string | null;
    empresaEnvio?: string | null;
    sucursal?: string | null;
    nombreRemitente?: string | null;
    ciRemitente?: string | null;
    telefonoRemitente?: string | null;
  } | null;
  snapshotCliente?: {
    usuarioId: string;
    nombreCompleto: string;
    email: string;
    telefono?: string | null;
    tipoDocumento?: "CI" | "NIT" | "PASAPORTE" | "OTRO" | null;
    numeroDocumento?: string | null;
  } | null;
  cliente?: {
    _id: string;
    nombreCompleto: string;
    email: string;
  };
  vendedor?: {
    _id: string;
    nombreCompleto: string;
    email: string;
  };
  reservadoEn?: string | null;
  reservaExpiraEn?: string | null;
  notas?: string | null;
  motivoCancelacion?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateEstadoPedidoDTO {
  estadoPedido?: EstadoPedido;
  estadoPago?: EstadoPago;
  estadoEntrega?: EstadoEntrega;
}
