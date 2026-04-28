import { z } from "zod";

export const estadoEntregaSchema = z.enum([
  "PENDING",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "NOT_APPLICABLE",
  "CANCELLED",
]);

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined || value === null || value === "") {
        return null;
      }

      return value;
    });

export const createFulfillmentSchema = z.object({
  pedidoId: z.string().min(1, "pedidoId es requerido"),
  codigoSeguimiento: nullableTrimmedString(100),
  nombreTransportista: nullableTrimmedString(120),
  asignadoA: nullableTrimmedString(100),
  notas: nullableTrimmedString(500),
});

export const updateFulfillmentStatusSchema = z.object({
  estado: estadoEntregaSchema,
  codigoSeguimiento: nullableTrimmedString(100),
  nombreTransportista: nullableTrimmedString(120),
  asignadoA: nullableTrimmedString(100),
  notas: nullableTrimmedString(500),
});

export type CreateFulfillmentInput = z.infer<typeof createFulfillmentSchema>;
export type UpdateFulfillmentStatusInput = z.infer<
  typeof updateFulfillmentStatusSchema
>;
