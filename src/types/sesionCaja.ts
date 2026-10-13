export type EstadoSesionCaja = "ABIERTA" | "CERRADA";

export interface MovimientoManualCaja {
  tipo: "INGRESO" | "EGRESO";
  monto: number;
  motivo: string;
  hora: string;
}

export interface SesionCaja {
  _id: string;
  sucursalId: {
    _id: string;
    nombre: string;
    codigo: string;
  } | string;
  cuentaDineroId: string;
  usuarioAperturaId: {
    _id: string;
    nombreCompleto: string;
    email: string;
  } | string;
  usuarioCierreId?: {
    _id: string;
    nombreCompleto: string;
    email: string;
  } | string | null;
  fechaApertura: string;
  fechaCierre?: string | null;
  montoApertura: number;
  totalVentasEfectivo: number;
  totalVentasQR: number;
  totalVentasTarjeta: number;
  totalIngresosManuales: number;
  totalEgresosManuales: number;
  montoEsperadoEfectivo: number;
  montoDeclaradoEfectivo?: number | null;
  diferenciaEfectivo?: number | null;
  movimientosManuales: MovimientoManualCaja[];
  estado: EstadoSesionCaja;
  notasApertura?: string | null;
  notasCierre?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AbrirSesionCajaInput = {
  sucursalId: string;
  montoApertura: number;
  notasApertura?: string;
};

export type CerrarSesionCajaInput = {
  sesionId: string;
  montoDeclaradoEfectivo: number;
  notasCierre?: string;
};

export type RegistrarMovimientoManualCajaInput = {
  sesionId: string;
  tipo: "INGRESO" | "EGRESO";
  monto: number;
  motivo: string;
};
