export const tipoSucursalValues = [
  "ALMACEN_CENTRAL",
  "TIENDA_FISICA",
  "PUNTO_RETIRO",
] as const;

export type TipoSucursal = (typeof tipoSucursalValues)[number];

export interface Sucursal {
  _id: string;
  nombre: string;
  codigo: string;
  tipo: TipoSucursal;
  direccion?: string;
  ciudad: string;
  telefono?: string;
  permiteVentaPOS: boolean;
  permiteDespachoWeb: boolean;
  permiteRetiroCliente: boolean;
  requiereAperturaCaja?: boolean;
  activa: boolean;
  esAlmacenPrincipal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateSucursalDTO = {
  nombre: string;
  codigo: string;
  tipo: TipoSucursal;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  permiteVentaPOS?: boolean;
  permiteDespachoWeb?: boolean;
  permiteRetiroCliente?: boolean;
  requiereAperturaCaja?: boolean;
  activa?: boolean;
  esAlmacenPrincipal?: boolean;
};

export type UpdateSucursalDTO = Partial<CreateSucursalDTO>;
