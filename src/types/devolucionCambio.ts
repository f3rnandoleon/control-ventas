export type TipoOperacionDevolucion = "DEVOLUCION" | "CAMBIO";
export type DestinoFisicoItem = "REINGRESO_STOCK" | "MERMA_DANADO";
export type AccionMonetaria = "REEMBOLSO_CLIENTE" | "COBRO_ADICIONAL" | "NINGUNO";

export interface ItemDevueltoInput {
  productoId: string;
  varianteId: string;
  nombre?: string;
  color?: string;
  talla?: string;
  cantidad: number;
  precioUnitario: number;
  precioCosto?: number;
  destinoFisico: DestinoFisicoItem;
  motivo: string;
}

export interface ItemEntregadoInput {
  productoId: string;
  varianteId: string;
  nombre?: string;
  color?: string;
  talla?: string;
  cantidad: number;
  precioUnitario: number;
  precioCosto?: number;
}

export interface ItemDevueltoRecord extends ItemDevueltoInput {
  subtotal: number;
}

export interface ItemEntregadoRecord extends ItemEntregadoInput {
  subtotal: number;
}

export interface RegistrarDevolucionCambioInput {
  pedidoId: string;
  tipo: TipoOperacionDevolucion;
  itemsDevueltos: ItemDevueltoInput[];
  itemsEntregados?: ItemEntregadoInput[];
  cuentaDineroId?: string;
  metodoPagoDiferencia?: "EFECTIVO" | "QR" | "TRANSFERENCIA" | "TARJETA";
  observaciones?: string;
}

export interface DevolucionCambio {
  _id: string;
  numeroOperacion: string;
  pedidoId: string;
  numeroPedido: string;
  sucursalId: string;
  tipo: TipoOperacionDevolucion;
  itemsDevueltos: ItemDevueltoRecord[];
  itemsEntregados?: ItemEntregadoRecord[];
  montoDevolucion: number;
  montoEntregado: number;
  diferenciaMonto: number;
  accionMonetaria: AccionMonetaria;
  cuentaDineroId?: string;
  usuarioId: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}
