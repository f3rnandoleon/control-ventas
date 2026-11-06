export type TipoAccionBanner = "WHATSAPP" | "URL_EXTERNA" | "NINGUNA";

export interface IBanner {
  _id?: string;
  titulo: string;
  descripcion?: string;
  imagenDesktopUrl: string;
  imagenMobileUrl?: string;
  tipoAccion: TipoAccionBanner;
  whatsappNumero?: string;
  whatsappMensaje?: string;
  enlaceUrl?: string;
  activo: boolean;
  orden: number;
  fechaInicio?: string | Date;
  fechaFin?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type BannerInput = Omit<IBanner, "_id" | "createdAt" | "updatedAt">;

