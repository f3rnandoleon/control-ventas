export type TipoMovimientoCuenta =
  | "INGRESO"
  | "EGRESO"
  | "TRANSFERENCIA";

export type OrigenMovimientoCuenta =
  | "VENTA_PEDIDO"
  | "COMPRA"
  | "GASTO"
  | "REEMBOLSO_DEVOLUCION"
  | "COBRO_DEVOLUCION"
  | "AJUSTE_ARQUEO"
  | "TRASLADO_ENTRE_CUENTAS"
  | "SALDO_INICIAL";

export interface MovimientoCuenta {
  _id: string;
  cuentaId: {
    _id: string;
    nombre: string;
    tipo: string;
  } | string;
  cuentaContraparteId?: {
    _id: string;
    nombre: string;
  } | string | null;
  tipo: TipoMovimientoCuenta;
  monto: number;
  saldoAnterior: number;
  saldoPosterior: number;
  concepto: string;
  origenTipo: OrigenMovimientoCuenta;
  origenId?: string | null;
  sucursalId?: {
    _id: string;
    nombre: string;
    codigo: string;
  } | string | null;
  usuarioId: {
    _id: string;
    nombreCompleto: string;
    email: string;
  } | string;
  comprobanteUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}
