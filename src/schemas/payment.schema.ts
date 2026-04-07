import { z } from "zod";
import { metodoPagoSchema, objectIdSchema } from "./common.schema";

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

export const createPaymentTransactionSchema = z.object({
  orderId: objectIdSchema,
  metodoPago: metodoPagoSchema,
  idempotencyKey: optionalTrimmedString(100),
  externalReference: optionalTrimmedString(150),
});

export const confirmPaymentSchema = z.object({
  externalReference: optionalTrimmedString(150),
});

export const failPaymentSchema = z.object({
  reason: optionalTrimmedString(250),
});

export const refundPaymentSchema = z.object({
  reason: optionalTrimmedString(250),
});

export type CreatePaymentTransactionInput = z.infer<
  typeof createPaymentTransactionSchema
>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type FailPaymentInput = z.infer<typeof failPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
