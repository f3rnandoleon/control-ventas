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
  pedidoId: objectIdSchema,
  metodoPago: metodoPagoSchema,
  idempotencyKey: optionalTrimmedString(100),
  referenciaExterna: optionalTrimmedString(150),
});

export const confirmPaymentSchema = z.object({
  referenciaExterna: optionalTrimmedString(150),
});

export const failPaymentSchema = z.object({
  motivo: optionalTrimmedString(250),
});

export const refundPaymentSchema = z.object({
  motivo: optionalTrimmedString(250),
});

export type CreatePaymentTransactionInput = z.infer<
  typeof createPaymentTransactionSchema
>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type FailPaymentInput = z.infer<typeof failPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
