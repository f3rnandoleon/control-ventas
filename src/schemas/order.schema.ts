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
