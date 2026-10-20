import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const whatsappCustomerSchema = z.object({
  phone: z.string().trim().min(7, "Teléfono no válido"),
  name: z.string().trim().optional(),
});

export const whatsappOrderItemSchema = z.object({
  productoId: z.string().trim().regex(objectIdRegex, "ID de producto inválido"),
  varianteId: z.string().trim().min(1, "varianteId inválido"),
  cantidad: z.number().int("La cantidad debe ser un entero").min(1, "La cantidad debe ser al menos 1"),
});

export const whatsappDeliverySchema = z
  .object({
    method: z.enum(["PICKUP_POINT", "SHIPPING_NATIONAL"]),
    scheduledFor: z.string().refine((val) => !isNaN(Date.parse(val)), "Fecha scheduledFor inválida"),
    pickupPointId: z.string().trim().optional(),
    pickupScheduleId: z.string().trim().optional(),
    department: z.string().trim().optional(),
    city: z.string().trim().optional(),
    shippingCompanyId: z.string().trim().optional(),
    branch: z.string().trim().optional(),
    recipientName: z.string().trim().min(2, "El nombre del destinatario debe tener al menos 2 caracteres"),
    recipientCi: z.string().trim().optional(),
    phone: z.string().trim().min(7, "Teléfono de entrega no válido"),
  })
  .superRefine((data, ctx) => {
    if (data.method === "SHIPPING_NATIONAL") {
      if (!data.department) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El departamento es requerido para envío nacional",
          path: ["department"],
        });
      }
      if (!data.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La ciudad es requerida para envío nacional",
          path: ["city"],
        });
      }
      if (!data.shippingCompanyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La empresa de envío es requerida para envío nacional",
          path: ["shippingCompanyId"],
        });
      }
      if (!data.branch) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La sucursal es requerida para envío nacional",
          path: ["branch"],
        });
      }
      if (!data.recipientCi) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El CI del destinatario es requerido para envío nacional",
          path: ["recipientCi"],
        });
      }
    }
  });

export const createWhatsAppOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(1, "idempotencyKey no puede estar vacío"),
  customer: whatsappCustomerSchema,
  items: z.array(whatsappOrderItemSchema).min(1, "El pedido debe contener al menos un item"),
  paymentMethod: z.literal("QR"),
  delivery: whatsappDeliverySchema,
  notes: z.string().trim().optional(),
});

export type CreateWhatsAppOrderInput = z.infer<typeof createWhatsAppOrderSchema>;

export const whatsappProductSearchSchema = z.object({
  q: z.string().trim().optional(),
  color: z.string().trim().optional(),
  talla: z.string().trim().optional(),
  minPrecio: z.coerce.number().min(0).optional(),
  maxPrecio: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type WhatsAppProductSearchInput = z.infer<typeof whatsappProductSearchSchema>;
