export interface PickupPoint {
  id: string;
  name: string;
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
}

export interface ShippingCompany {
  id: string;
  name: string;
  departments: Department[];
}

export interface DeliveryOptions {
  pickupPoints: PickupPoint[];
  pickupSchedules: PickupSchedule[];
  shippingCompanies: ShippingCompany[];
}
