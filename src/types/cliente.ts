export type TipoDocumentoCliente = "CI" | "NIT" | "PASAPORTE" | "OTRO";

export type MetodoEntregaCliente =
  | "WHATSAPP"
  | "PICKUP_POINT"
  | "SHIPPING_NATIONAL";

export interface PerfilCliente {
  _id: string;
  usuarioId: string;
  telefono?: string | null;
  tipoDocumento?: TipoDocumentoCliente | null;
  numeroDocumento?: string | null;
  metodoEntregaPredeterminado?: MetodoEntregaCliente | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DireccionCliente {
  _id: string;
  perfilClienteId: string;
  etiqueta: string;
  nombreDestinatario: string;
  telefono: string;
  departamento: string;
  ciudad: string;
  zona?: string | null;
  direccion: string;
  referencia?: string | null;
  codigoPostal?: string | null;
  pais: string;
  esPredeterminada: boolean;
  estaActiva: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RespuestaClienteMe {
  user: {
    _id: string;
    nombreCompleto: string;
    email: string;
    rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
    estaActivo: boolean;
    createdAt: string;
    updatedAt: string;
    ultimoAcceso?: string;
  };
  profile: PerfilCliente;
  defaultAddress: DireccionCliente | null;
}

export type ActualizarPerfilClienteDTO = {
  nombreCompleto?: string;
  telefono?: string;
  tipoDocumento?: TipoDocumentoCliente | null;
  numeroDocumento?: string | null;
  metodoEntregaPredeterminado?: MetodoEntregaCliente | null;
  notas?: string | null;
};

export type CrearDireccionClienteDTO = {
  etiqueta: string;
  nombreDestinatario: string;
  telefono: string;
  departamento: string;
  ciudad: string;
  zona?: string | null;
  direccion: string;
  referencia?: string | null;
  codigoPostal?: string | null;
  pais?: string;
  esPredeterminada?: boolean;
};

export type ActualizarDireccionClienteDTO = Partial<CrearDireccionClienteDTO>;
