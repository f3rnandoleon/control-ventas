export type TipoCuentaDinero =
  | "CAJA_FISICA"
  | "BANCO"
  | "BILLETERA_QR"
  | "PASARELA";

export interface CuentaDinero {
  _id: string;
  nombre: string;
  tipo: TipoCuentaDinero;
  moneda: "BOB" | "USD";
  saldoActual: number;
  sucursalId?: {
    _id: string;
    nombre: string;
    codigo: string;
  } | string | null;
  numeroCuenta?: string | null;
  bancoNombre?: string | null;
  activa: boolean;
  esPredeterminadaPOS: boolean;
  esPredeterminadaQR: boolean;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CrearCuentaDineroInput = {
  nombre: string;
  tipo: TipoCuentaDinero;
  moneda?: "BOB" | "USD";
  saldoInicial?: number;
  sucursalId?: string | null;
  numeroCuenta?: string | null;
  bancoNombre?: string | null;
  esPredeterminadaPOS?: boolean;
  esPredeterminadaQR?: boolean;
  notas?: string | null;
};
