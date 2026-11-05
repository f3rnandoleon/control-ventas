export type ModalidadCobroEnvio = "PAGO_EN_DESTINO" | "TARIFA_FIJA" | "POR_COORDINAR";

export interface PickupPoint {
  id: string;
  name: string;
  costoBOB?: number;
  costoEstimadoBOB?: number;
  googleMapsUrl?: string;
}

export interface PickupSchedule {
  id: string;
  day: string;
  start: string;
  end: string;
  label: string;
}

export interface Branch {
  name: string;
}

export interface Department {
  name: string;
  branches: string[];
  modalidadCobro?: ModalidadCobroEnvio;
  costoEstimadoBOB?: number;
  tiempoEstimadoHoras?: string;
  googleMapsUrl?: string;
}

export interface ShippingCompany {
  id: string;
  name: string;
  modalidadCobro?: ModalidadCobroEnvio;
  costoEstimadoBOB?: number;
  tiempoEstimadoHoras?: string;
  googleMapsUrl?: string;
  departments: Department[];
}

export interface DeliveryOptions {
  pickupPoints: PickupPoint[];
  pickupSchedules: PickupSchedule[];
  shippingCompanies: ShippingCompany[];
}
