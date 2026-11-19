export type EstadoPromocion = "BORRADOR" | "ACTIVA" | "PAUSADA" | "FINALIZADA";

export type MetodoActivacionPromocion = "AUTOMATICA" | "CUPON";

export type TipoPromocion =
  | "PORCENTAJE"
  | "MONTO_FIJO"
  | "NXM"
  | "SEGUNDA_UNIDAD"
  | "ENVIO_GRATIS";

export type AlcancePromocion = "PEDIDO" | "PRODUCTOS" | "CATEGORIAS" | "ENVIO";

export type CanalPromocion = "WEB" | "WHATSAPP";

export interface ReglaNxM {
  lleva: number;
  paga: number;
}

export interface CondicionesPromocion {
  montoMinimoCompra?: number;
  cantidadMinimaPrendas?: number;
  soloPrimeraCompra?: boolean;
}

export interface IPromocion {
  _id: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoPromocion;
  canales: CanalPromocion[];
  metodoActivacion: MetodoActivacionPromocion;
  tipo: TipoPromocion;
  valor: number;
  reglaNxM?: ReglaNxM | null;
  descuentoMaximo?: number | null;
  alcance: AlcancePromocion;
  productosIncluidos: string[];
  categoriasIncluidas: string[];
  productosExcluidos: string[];
  condiciones: CondicionesPromocion;
  prioridad: number;
  acumulable: boolean;
  acumulableConRebajasCatalogo: boolean;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  usoMaximoTotal?: number | null;
  usoMaximoPorCliente?: number | null;
  usosActuales: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICupon {
  _id: string;
  codigo: string;
  promocionId: string | IPromocion;
  activo: boolean;
  usoMaximoTotal?: number | null;
  usoMaximoPorCliente?: number | null;
  usosActuales: number;
  createdAt?: string;
  updatedAt?: string;
}

export type EstadoUsoPromocion = "RESERVADO" | "APLICADO" | "REVERTIDO";

export interface IUsoPromocion {
  _id: string;
  promocionId: string;
  cuponId?: string | null;
  codigoCupon?: string | null;
  pedidoId: string;
  clienteId?: string | null;
  telefonoInvitado?: string | null;
  montoDescontado: number;
  estado: EstadoUsoPromocion;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromocionAplicadaSnapshot {
  promocionId: string;
  cuponId?: string | null;
  codigoCupon?: string | null;
  nombre: string;
  tipo: TipoPromocion;
  alcance: AlcancePromocion;
  montoDescontado: number;
}

export interface ItemEvaluadoPromocion {
  productoId: string;
  varianteId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  categoria?: string;
  cantidad: number;
  precioUnitarioLista: number;
  precioWebEfectivo: number;
  precioCosto: number;
  tieneRebajaCatalogo: boolean;
  descuentoCatalogo: number;
  descuentoLinea: number;
  descuentoProrrateado: number;
  totalLineaBruto: number;
  totalLineaNeto: number;
  gananciaNeta: number;
}

export interface EvaluacionPromocionesResult {
  subtotalLista: number;
  subtotalPostCatalogo: number;
  descuentoCatalogo: number;
  descuentoPromociones: number;
  descuentoEnvio: number;
  descuentoTotal: number;
  costoEnvioOriginal: number;
  costoEnvioFinal: number;
  totalFinal: number;
  gananciaTotalNeta: number;
  promocionesAplicadas: PromocionAplicadaSnapshot[];
  items: ItemEvaluadoPromocion[];
  cuponCodigo: string | null;
  cuponValido: boolean;
  cuponErrorCodigo?: string | null;
  cuponErrorMensaje?: string | null;
}
