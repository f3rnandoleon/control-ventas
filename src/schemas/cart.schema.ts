import { z } from "zod";
import {
  nonEmptyStringSchema,
  objectIdSchema,
  positiveIntegerSchema,
} from "./common.schema";

const optionalObjectIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  objectIdSchema.optional()
);

export const addCartItemSchema = z.object({
  productoId: objectIdSchema,
  variantId: optionalObjectIdSchema,
  color: nonEmptyStringSchema.max(50, "El color no puede exceder 50 caracteres"),
  colorSecundario: z
    .string()
    .trim()
    .max(50, "El color secundario no puede exceder 50 caracteres")
    .optional(),
  talla: nonEmptyStringSchema.max(20, "La talla no puede exceder 20 caracteres"),
  cantidad: positiveIntegerSchema.max(1000, "La cantidad no puede exceder 1000"),
});

export const updateCartItemSchema = z.object({
  cantidad: positiveIntegerSchema.max(1000, "La cantidad no puede exceder 1000"),
});

export const checkoutCartSchema = z.object({
  metodoPago: z.enum(["EFECTIVO", "QR"]),
  addressId: optionalObjectIdSchema,
  delivery: z
    .object({
      method: z.enum(["WHATSAPP", "PICKUP_LAPAZ", "HOME_DELIVERY"]),
      pickupPoint: z
        .enum(["TELEFERICO_MORADO", "TELEFERICO_ROJO", "CORREOS"])
        .nullable()
        .optional(),
      address: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      recipientName: nonEmptyStringSchema
        .max(100, "El destinatario no puede exceder 100 caracteres")
        .nullable()
        .optional(),
    })
    .optional(),
  notes: nonEmptyStringSchema
    .max(300, "Las notas no pueden exceder 300 caracteres")
    .optional(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CheckoutCartInput = z.infer<typeof checkoutCartSchema>;
