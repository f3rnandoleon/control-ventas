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
  pickupPoint: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  shippingCompany: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  senderCI: z.string().optional().nullable(),
  senderPhone: z.string().optional().nullable(),
});

export type UpdateOrderDeliveryInput = z.infer<typeof updateOrderDeliverySchema>;
