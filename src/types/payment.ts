export type EstadoTransaccionPago =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export interface TransaccionPago {
  _id: string;
  numeroPago: string;
  pedidoId: string;
  cliente?: string | null;
  metodoPago: "EFECTIVO" | "QR";
  monto: number;
  estado: EstadoTransaccionPago;
  idempotencyKey?: string | null;
  referenciaExterna?: string | null;
  motivoFallo?: string | null;
  confirmadoEn?: string | null;
  falladoEn?: string | null;
  reembolsadoEn?: string | null;
  urlComprobante?: string | null;
  tokenRevision?: string | null;
  tokenRevisionUsado?: boolean;
  createdAt: string;
  updatedAt: string;
}
