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

export const tipoDocumentoClienteSchema = z.enum([
  "CI",
  "NIT",
  "PASAPORTE",
  "OTRO",
]);

export const metodoEntregaClienteSchema = z.enum([
  "WHATSAPP",
  "PICKUP_POINT",
  "SHIPPING_NATIONAL",
]);

export const actualizarPerfilClienteSchema = z
  .object({
    nombreCompleto: nonEmptyStringSchema
      .min(3, "El nombre completo debe tener al menos 3 caracteres")
      .max(100, "El nombre completo no puede exceder 100 caracteres")
      .optional(),
    telefono: optionalTrimmedString(30),
    tipoDocumento: optionalNullableEnum(["CI", "NIT", "PASAPORTE", "OTRO"]),
    numeroDocumento: optionalTrimmedString(30).nullable().optional(),
    metodoEntregaPredeterminado: optionalNullableEnum([
      "WHATSAPP",
      "PICKUP_POINT",
      "SHIPPING_NATIONAL",
    ]),
    notas: optionalTrimmedString(300).nullable().optional(),
  })
  .refine(atLeastOneField, {
    message: "Debe enviar al menos un campo a actualizar",
  });

export const crearDireccionClienteSchema = z.object({
  etiqueta: nonEmptyStringSchema
    .min(2, "La etiqueta debe tener al menos 2 caracteres")
    .max(50, "La etiqueta no puede exceder 50 caracteres"),
  nombreDestinatario: nonEmptyStringSchema
    .min(3, "El destinatario debe tener al menos 3 caracteres")
    .max(100, "El destinatario no puede exceder 100 caracteres"),
  telefono: nonEmptyStringSchema
    .min(6, "El telefono debe tener al menos 6 caracteres")
    .max(30, "El telefono no puede exceder 30 caracteres"),
  departamento: nonEmptyStringSchema
    .min(2, "El departamento es obligatorio")
    .max(60, "El departamento no puede exceder 60 caracteres"),
  ciudad: nonEmptyStringSchema
    .min(2, "La ciudad es obligatoria")
    .max(60, "La ciudad no puede exceder 60 caracteres"),
  zona: optionalTrimmedString(120).nullable().optional(),
  direccion: nonEmptyStringSchema
    .min(5, "La direccion debe tener al menos 5 caracteres")
    .max(250, "La direccion no puede exceder 250 caracteres"),
  referencia: optionalTrimmedString(250).nullable().optional(),
  codigoPostal: optionalTrimmedString(20).nullable().optional(),
  pais: z
    .string()
    .trim()
    .min(2, "El pais es obligatorio")
    .max(60, "El pais no puede exceder 60 caracteres")
    .default("Bolivia")
    .optional(),
  esPredeterminada: z.boolean().optional(),
});

export const actualizarDireccionClienteSchema = z
  .object({
    etiqueta: nonEmptyStringSchema
      .min(2, "La etiqueta debe tener al menos 2 caracteres")
      .max(50, "La etiqueta no puede exceder 50 caracteres")
      .optional(),
    nombreDestinatario: nonEmptyStringSchema
      .min(3, "El destinatario debe tener al menos 3 caracteres")
      .max(100, "El destinatario no puede exceder 100 caracteres")
      .optional(),
    telefono: nonEmptyStringSchema
      .min(6, "El telefono debe tener al menos 6 caracteres")
      .max(30, "El telefono no puede exceder 30 caracteres")
      .optional(),
    departamento: nonEmptyStringSchema
      .min(2, "El departamento es obligatorio")
      .max(60, "El departamento no puede exceder 60 caracteres")
      .optional(),
    ciudad: nonEmptyStringSchema
      .min(2, "La ciudad es obligatoria")
      .max(60, "La ciudad no puede exceder 60 caracteres")
      .optional(),
    zona: optionalTrimmedString(120).nullable().optional(),
    direccion: nonEmptyStringSchema
      .min(5, "La direccion debe tener al menos 5 caracteres")
      .max(250, "La direccion no puede exceder 250 caracteres")
      .optional(),
    referencia: optionalTrimmedString(250).nullable().optional(),
    codigoPostal: optionalTrimmedString(20).nullable().optional(),
    pais: z
      .string()
      .trim()
      .min(2, "El pais es obligatorio")
      .max(60, "El pais no puede exceder 60 caracteres")
      .optional(),
    esPredeterminada: z.boolean().optional(),
  })
  .refine(atLeastOneField, {
    message: "Debe enviar al menos un campo a actualizar",
  });

export const parametrosDireccionClienteSchema = z.object({
  direccionId: objectIdSchema,
});

export type ActualizarPerfilClienteInput = z.infer<
  typeof actualizarPerfilClienteSchema
>;
export type CrearDireccionClienteInput = z.infer<
  typeof crearDireccionClienteSchema
>;
export type ActualizarDireccionClienteInput = z.infer<
  typeof actualizarDireccionClienteSchema
>;
