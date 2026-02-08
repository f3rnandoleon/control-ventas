import { z } from "zod";
import {
    objectIdSchema,
    nonEmptyStringSchema,
    positiveIntegerSchema,
    metodoPagoSchema,
    tipoVentaSchema,
} from "./common.schema";

// ============================================
// SCHEMAS DE VENTA
// ============================================

/**
 * Schema para item de venta
 */
export const createVentaItemSchema = z.object({
    productoId: objectIdSchema,

    color: nonEmptyStringSchema
        .max(50, "El color no puede exceder 50 caracteres"),

    talla: nonEmptyStringSchema
        .max(20, "La talla no puede exceder 20 caracteres"),

    cantidad: positiveIntegerSchema
        .max(1000, "La cantidad no puede exceder 1000 unidades"),
});

/**
 * Schema para crear una venta
 */
export const createVentaSchema = z.object({
    items: z
        .array(createVentaItemSchema)
        .min(1, "Debe agregar al menos un producto a la venta"),

    metodoPago: metodoPagoSchema,

    tipoVenta: tipoVentaSchema,

    descuento: z
        .number()
        .nonnegative("El descuento no puede ser negativo")
        .max(100, "El descuento no puede exceder el 100%")
        .default(0)
        .optional(),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type CreateVentaItemInput = z.infer<typeof createVentaItemSchema>;
export type CreateVentaInput = z.infer<typeof createVentaSchema>;
