import { z } from "zod";
import {
  objectIdSchema,
  nonEmptyStringSchema,
  positiveNumberSchema,
  nonNegativeIntegerSchema,
} from "./common.schema";

export const compraItemInputSchema = z.object({
  productoId: objectIdSchema,
  varianteId: z.string().min(1, "varianteId es requerido"),
  color: nonEmptyStringSchema,
  colorSecundario: z.string().trim().optional(),
  talla: nonEmptyStringSchema,
  cantidad: nonNegativeIntegerSchema.refine((val) => val > 0, {
    message: "La cantidad debe ser mayor a 0",
  }),
  costoUnitarioOrigen: positiveNumberSchema,
  costoUnitarioBOB: positiveNumberSchema.optional(),
});

export const createCompraSchema = z.object({
  sucursalDestinoId: objectIdSchema.optional(),
  fecha: z.union([z.string(), z.date()]).optional(),
  proveedor: z.string().trim().max(120, "El proveedor no puede exceder 120 caracteres").optional(),
  comprobanteReferencia: z.string().trim().max(100, "La referencia no puede exceder 100 caracteres").optional(),
  monedaOrigen: z.enum(["PEN", "BOB", "USD"]).default("BOB"),
  tipoCambio: positiveNumberSchema.default(1),
  notas: z.string().trim().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
  items: z.array(compraItemInputSchema).min(1, "Debe incluir al menos un ítem en la compra"),
});

export type CompraItemInputSchema = z.infer<typeof compraItemInputSchema>;
export type CreateCompraInputSchema = z.infer<typeof createCompraSchema>;
