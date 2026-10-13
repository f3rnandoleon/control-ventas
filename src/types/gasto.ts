export type CategoriaGasto =
  | "PUBLICIDAD_MARKETING"
  | "EMPAQUES_BOLSAS"
  | "ALQUILER_TIENDA"
  | "SUELDOS_COMISIONES"
  | "SERVICIOS_BASICOS"
  | "TRANSPORTE_ENVIOS"
  | "MANTENIMIENTO_LIMPIEZA"
  | "OTROS";

export type NaturalezaGasto = "FIJO" | "VARIABLE";

export interface Gasto {
  _id: string;
  numeroGasto: string;
  fecha: string;
  categoria: CategoriaGasto;
  naturaleza: NaturalezaGasto;
  monto: number;
  descripcion: string;
  beneficiarioProveedor?: string | null;
  comprobanteUrl?: string | null;
  cuentaDineroId: {
    _id: string;
    nombre: string;
    tipo: string;
  } | string;
  sucursalId?: {
    _id: string;
    nombre: string;
    codigo: string;
  } | string | null;
  creadoPor: {
    _id: string;
    nombreCompleto: string;
    email: string;
  } | string;
  createdAt: string;
  updatedAt: string;
}

export type RegistrarGastoInput = {
  fecha?: string | Date;
  categoria: CategoriaGasto;
  naturaleza: NaturalezaGasto;
  monto: number;
  descripcion: string;
  beneficiarioProveedor?: string;
  comprobanteUrl?: string;
  cuentaDineroId: string;
  sucursalId?: string | null;
};
