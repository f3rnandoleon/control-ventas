import { z } from "zod";

export const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
]);

export const paymentStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const fulfillmentStatusSchema = z.enum([
  "PENDING",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "NOT_APPLICABLE",
  "CANCELLED",
]);

export const updateOrderStatusSchema = z
  .object({
    orderStatus: orderStatusSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    fulfillmentStatus: fulfillmentStatusSchema.optional(),
  })
  .refine(
    (data) =>
      data.orderStatus !== undefined ||
      data.paymentStatus !== undefined ||
      data.fulfillmentStatus !== undefined,
    {
      message: "Debe enviar al menos un campo a actualizar",
    }
  );

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const updateOrderDeliverySchema = z.object({
  method: z.enum(["WHATSAPP", "PICKUP_POINT", "SHIPPING_NATIONAL"]).optional(),
  pickupPoint: z.string().max(250).optional().nullable(),
  address: z.string().max(250).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  recipientName: z.string().max(100).optional().nullable(),
  scheduledAt: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  shippingCompany: z.string().max(150).optional().nullable(),
  branch: z.string().max(150).optional().nullable(),
  senderName: z.string().max(100).optional().nullable(),
  senderCI: z.string().max(20).optional().nullable(),
  senderPhone: z.string().max(20).optional().nullable(),
});

export type UpdateOrderDeliveryInput = z.infer<typeof updateOrderDeliverySchema>;
