import { z } from "zod";

const optionalText = z.string().trim().max(100).optional().transform((value) => value || undefined);

export const salesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().refine((value) => [10, 25, 50].includes(value), "Límite inválido").default(25),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customer: optionalText,
  seller: optionalText,
  paymentMethod: z.enum(["EFECTIVO", "QR"]).optional(),
}).refine((data) => !data.from || !data.to || data.from <= data.to, {
  message: "La fecha desde no puede ser posterior a la fecha hasta",
  path: ["to"],
});

export type SalesQueryInput = z.infer<typeof salesQuerySchema>;
