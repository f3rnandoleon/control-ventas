export type CustomerDocumentType = "CI" | "NIT" | "PASAPORTE" | "OTRO";

export type CustomerDeliveryMethod =
  | "WHATSAPP"
  | "PICKUP_LAPAZ"
  | "PICKUP_POINT";

export interface CustomerProfile {
  _id: string;
  userId: string;
  phone?: string | null;
  documentType?: CustomerDocumentType | null;
  documentNumber?: string | null;
  defaultDeliveryMethod?: CustomerDeliveryMethod | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  _id: string;
  customerProfileId: string;
  label: string;
  recipientName: string;
  phone: string;
  department: string;
  city: string;
  zone?: string | null;
  addressLine: string;
  reference?: string | null;
  postalCode?: string | null;
  country: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerMeResponse {
  user: {
    _id: string;
    fullname: string;
    email: string;
    role: "ADMIN" | "VENDEDOR" | "CLIENTE";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
  };
  profile: CustomerProfile;
  defaultAddress: CustomerAddress | null;
}

export type UpdateCustomerProfileDTO = {
  fullname?: string;
  phone?: string;
  documentType?: CustomerDocumentType | null;
  documentNumber?: string | null;
  defaultDeliveryMethod?: CustomerDeliveryMethod | null;
  notes?: string | null;
};

export type CreateCustomerAddressDTO = {
  label: string;
  recipientName: string;
  phone: string;
  department: string;
  city: string;
  zone?: string | null;
  addressLine: string;
  reference?: string | null;
  postalCode?: string | null;
  country?: string;
  isDefault?: boolean;
};

export type UpdateCustomerAddressDTO = Partial<CreateCustomerAddressDTO>;
