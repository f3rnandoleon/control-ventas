export interface PoliticaItem {
  titulo: string;
  contenido: string;
  version?: string;
  activo?: boolean;
  ultimaActualizacion?: string | Date;
}

export interface PoliticaDevolucion extends PoliticaItem {
  diasLimiteDevolucion: number;
}

export interface PoliticaCookies extends PoliticaItem {
  mostrarBanner: boolean;
  mensajeBanner: string;
}

export interface FinanzasAjustes {
  tipoCambioPEN_BOB: number;
  monedaPrincipal?: string;
  ultimaActualizacionTipoCambio?: string | Date;
  actualizadoPor?: string;
}

export interface PoliticasAjustes {
  devoluciones: PoliticaDevolucion;
  privacidad: PoliticaItem;
  terminos: PoliticaItem;
  cookies: PoliticaCookies;
}

export interface AjustesSistemaDTO {
  _id?: string;
  key: string;
  finanzas: FinanzasAjustes;
  politicas: PoliticasAjustes;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PublicPoliticasResponse {
  devoluciones: PoliticaDevolucion;
  privacidad: PoliticaItem;
  terminos: PoliticaItem;
  cookies: PoliticaCookies;
}
