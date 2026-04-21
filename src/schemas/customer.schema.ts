import { z } from "zod";
import { nonEmptyStringSchema, objectIdSchema } from "./common.schema";

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(max).optional()
  );

const optionalNullableEnum = <T extends [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.null()]).optional();

const atLeastOneField = (data: Record<string, unknown>) =>
  Object.values(data).some((value) => value !== undefined);

export const customerDocumentTypeSchema = z.enum([
  "CI",
  "NIT",
  "PASAPORTE",
  "OTRO",
]);

export const customerDeliveryMethodSchema = z.enum([
  "WHATSAPP",
  "PICKUP_POINT",
]);

export const updateCustomerProfileSchema = z
  .object({
    fullname: nonEmptyStringSchema
      .min(3, "El nombre completo debe tener al menos 3 caracteres")
      .max(100, "El nombre completo no puede exceder 100 caracteres")
      .optional(),
    phone: optionalTrimmedString(30),
    documentType: optionalNullableEnum(["CI", "NIT", "PASAPORTE", "OTRO"]),
    documentNumber: optionalTrimmedString(30).nullable().optional(),
    defaultDeliveryMethod: optionalNullableEnum([
      "WHATSAPP",
      "PICKUP_POINT",
    ]),
    notes: optionalTrimmedString(300).nullable().optional(),
  })
  .refine(atLeastOneField, {
    message: "Debe enviar al menos un campo a actualizar",
  });

export const createCustomerAddressSchema = z.object({
  label: nonEmptyStringSchema
    .min(2, "La etiqueta debe tener al menos 2 caracteres")
    .max(50, "La etiqueta no puede exceder 50 caracteres"),
  recipientName: nonEmptyStringSchema
    .min(3, "El destinatario debe tener al menos 3 caracteres")
    .max(100, "El destinatario no puede exceder 100 caracteres"),
  phone: nonEmptyStringSchema
    .min(6, "El telefono debe tener al menos 6 caracteres")
    .max(30, "El telefono no puede exceder 30 caracteres"),
  department: nonEmptyStringSchema
    .min(2, "El departamento es obligatorio")
    .max(60, "El departamento no puede exceder 60 caracteres"),
  city: nonEmptyStringSchema
    .min(2, "La ciudad es obligatoria")
    .max(60, "La ciudad no puede exceder 60 caracteres"),
  zone: optionalTrimmedString(120).nullable().optional(),
  addressLine: nonEmptyStringSchema
    .min(5, "La direccion debe tener al menos 5 caracteres")
    .max(250, "La direccion no puede exceder 250 caracteres"),
  reference: optionalTrimmedString(250).nullable().optional(),
  postalCode: optionalTrimmedString(20).nullable().optional(),
  country: z
    .string()
    .trim()
    .min(2, "El pais es obligatorio")
    .max(60, "El pais no puede exceder 60 caracteres")
    .default("Bolivia")
    .optional(),
  isDefault: z.boolean().optional(),
});

export const updateCustomerAddressSchema = z
  .object({
    label: nonEmptyStringSchema
      .min(2, "La etiqueta debe tener al menos 2 caracteres")
      .max(50, "La etiqueta no puede exceder 50 caracteres")
      .optional(),
    recipientName: nonEmptyStringSchema
      .min(3, "El destinatario debe tener al menos 3 caracteres")
      .max(100, "El destinatario no puede exceder 100 caracteres")
      .optional(),
    phone: nonEmptyStringSchema
      .min(6, "El telefono debe tener al menos 6 caracteres")
      .max(30, "El telefono no puede exceder 30 caracteres")
      .optional(),
    department: nonEmptyStringSchema
      .min(2, "El departamento es obligatorio")
      .max(60, "El departamento no puede exceder 60 caracteres")
      .optional(),
    city: nonEmptyStringSchema
      .min(2, "La ciudad es obligatoria")
      .max(60, "La ciudad no puede exceder 60 caracteres")
      .optional(),
    zone: optionalTrimmedString(120).nullable().optional(),
    addressLine: nonEmptyStringSchema
      .min(5, "La direccion debe tener al menos 5 caracteres")
      .max(250, "La direccion no puede exceder 250 caracteres")
      .optional(),
    reference: optionalTrimmedString(250).nullable().optional(),
    postalCode: optionalTrimmedString(20).nullable().optional(),
    country: z
      .string()
      .trim()
      .min(2, "El pais es obligatorio")
      .max(60, "El pais no puede exceder 60 caracteres")
      .optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(atLeastOneField, {
    message: "Debe enviar al menos un campo a actualizar",
  });

export const customerAddressParamsSchema = z.object({
  addressId: objectIdSchema,
});

export type UpdateCustomerProfileInput = z.infer<
  typeof updateCustomerProfileSchema
>;
export type CreateCustomerAddressInput = z.infer<
  typeof createCustomerAddressSchema
>;
export type UpdateCustomerAddressInput = z.infer<
  typeof updateCustomerAddressSchema
>;
