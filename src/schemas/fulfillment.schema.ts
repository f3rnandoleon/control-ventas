import { z } from "zod";

export const fulfillmentStatusSchema = z.enum([
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
  orderId: z.string().min(1, "orderId es requerido"),
  trackingCode: nullableTrimmedString(100),
  courierName: nullableTrimmedString(120),
  assignedTo: nullableTrimmedString(100),
  notes: nullableTrimmedString(500),
});

export const updateFulfillmentStatusSchema = z.object({
  status: fulfillmentStatusSchema,
  trackingCode: nullableTrimmedString(100),
  courierName: nullableTrimmedString(120),
  assignedTo: nullableTrimmedString(100),
  notes: nullableTrimmedString(500),
});

export type CreateFulfillmentInput = z.infer<typeof createFulfillmentSchema>;
export type UpdateFulfillmentStatusInput = z.infer<
  typeof updateFulfillmentStatusSchema
>;
