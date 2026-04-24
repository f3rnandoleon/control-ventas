import { z } from "zod";
import { createPedidoItemSchema, updatePedidoEntregaSchema } from "@/schemas/pedido.schema";
import { metodoPagoSchema } from "@/schemas/common.schema";

export const createPosSaleSchema = z.object({
  items: z
    .array(createPedidoItemSchema)
    .min(1, "Debe agregar al menos un producto a la venta"),
  metodoPago: metodoPagoSchema,
  descuento: z
    .number()
    .nonnegative("El descuento no puede ser negativo")
    .max(100, "El descuento no puede exceder el 100%")
    .default(0)
    .optional(),
  delivery: updatePedidoEntregaSchema.optional(),
});

export type CreatePosSaleInput = z.infer<typeof createPosSaleSchema>;
