export interface EstadoResultadosFiltros {
  desde: string;
  hasta: string;
  sucursalId?: string;
}

export interface DesgloseCategoriaGasto {
  categoria: string;
  naturaleza: "FIJO" | "VARIABLE";
  monto: number;
}

export interface DesgloseSucursalPL {
  sucursalId: string;
  nombreSucursal: string;
  codigoSucursal: string;
  ventasBrutas: number;
  descuentos: number;
  ventasNetas: number;
  costoVentasCOGS: number;
  utilidadBruta: number;
  gastosOperativos: number;
  mermas: number;
  utilidadNeta: number;
}

export interface EstadoResultadosReporte {
  periodo: {
    desde: string;
    hasta: string;
  };
  sucursalFiltro?: {
    id: string;
    nombre: string;
  } | null;
  metricas: {
    ventasBrutas: number;
    descuentos: number;
    ventasNetas: number;
    costoVentasCOGS: number;
    utilidadBruta: number;
    margenBrutoPorcentaje: number;
    gastosFijos: number;
    gastosVariables: number;
    gastosOperativosTotal: number;
    mermasTotal: number;
    utilidadNeta: number;
    margenNetoPorcentaje: number;
    cantidadPedidos: number;
    prendasVendidas: number;
  };
  gastosPorCategoria: DesgloseCategoriaGasto[];
  desglosePorSucursales: DesgloseSucursalPL[];
}

export interface FlujoCajaCuentaResumen {
  cuentaId: string;
  nombreCuenta: string;
  tipoCuenta: string;
  moneda: string;
  saldoInicialEstimado: number;
  totalIngresos: number;
  totalEgresos: number;
  flujoNeto: number;
  saldoFinalEstimado: number;
}

export interface FlujoCajaReporte {
  periodo: {
    desde: string;
    hasta: string;
  };
  resumenGlobal: {
    totalIngresos: number;
    totalEgresos: number;
    flujoNeto: number;
  };
  cuentas: FlujoCajaCuentaResumen[];
}

export interface CierrePeriodoItem {
  _id: string;
  anio: number;
  mes: number;
  mesNombre: string;
  bloqueado: boolean;
  cerradoPor: {
    _id: string;
    nombreCompleto?: string;
    email?: string;
  };
  fechaCierre: string;
  utilidadNetaAlCierre?: number;
  observaciones?: string;
}
