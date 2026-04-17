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

const optionalStr = (max: number) =>
  z.string().trim().max(max).optional().nullable();

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

export const checkoutCartSchema = z
  .object({
    metodoPago: z.enum(["EFECTIVO", "QR"]),
    addressId: optionalObjectIdSchema,
    notes: nonEmptyStringSchema
      .max(300, "Las notas no pueden exceder 300 caracteres")
      .optional(),

    delivery: z
      .object({
        method: z.enum(["WHATSAPP", "PICKUP_POINT", "SHIPPING_NATIONAL"]),

        // PICKUP_POINT (Puntos de entrega)
        pickupPoint: optionalStr(150),
        phone: optionalStr(20),
        recipientName: optionalStr(100),
        scheduledAt: optionalStr(100),

        // SHIPPING_NATIONAL (Otro departamento)
        department: optionalStr(100),
        city: optionalStr(100),
        shippingCompany: optionalStr(150),
        branch: optionalStr(150),
        senderName: optionalStr(100),
        senderCI: optionalStr(20),
        senderPhone: optionalStr(20),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const method = data.delivery?.method;

    if (method === "PICKUP_POINT") {
      if (!data.delivery?.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El celular de contacto es obligatorio para el punto de encuentro",
          path: ["delivery", "phone"],
        });
      }
      if (!data.delivery?.pickupPoint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El lugar de encuentro es obligatorio",
          path: ["delivery", "pickupPoint"],
        });
      }
    }

    if (method === "SHIPPING_NATIONAL") {
      if (data.metodoPago !== "QR") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El envío a otro departamento requiere pago por QR",
          path: ["metodoPago"],
        });
      }
      if (!data.delivery?.department) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El departamento destino es obligatorio",
          path: ["delivery", "department"],
        });
      }
      if (!data.delivery?.shippingCompany) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La empresa de transporte es obligatoria",
          path: ["delivery", "shippingCompany"],
        });
      }
      if (!data.delivery?.senderName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del remitente es obligatorio",
          path: ["delivery", "senderName"],
        });
      }
      if (!data.delivery?.senderCI) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El carnet del remitente es obligatorio",
          path: ["delivery", "senderCI"],
        });
      }
      if (!data.delivery?.senderPhone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El celular del remitente es obligatorio",
          path: ["delivery", "senderPhone"],
        });
      }
    }
  });

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CheckoutCartInput = z.infer<typeof checkoutCartSchema>;
