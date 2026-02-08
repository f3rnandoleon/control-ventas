import { z } from "zod";
import {
    objectIdSchema,
    nonEmptyStringSchema,
    tipoMovimientoSchema,
} from "./common.schema";

// ============================================
// SCHEMAS DE INVENTARIO
// ============================================

/**
 * Schema para ajuste de stock
 */
export const ajusteStockSchema = z.object({
    productoId: objectIdSchema,

    color: nonEmptyStringSchema
        .max(50, "El color no puede exceder 50 caracteres"),

    talla: nonEmptyStringSchema
        .max(20, "La talla no puede exceder 20 caracteres"),

    tipo: tipoMovimientoSchema,

    cantidad: z.coerce
        .number()
        .int("La cantidad debe ser un número entero")
        .refine((val) => val !== 0, {
            message: "La cantidad no puede ser 0",
        }),

    motivo: z
        .string()
        .max(200, "El motivo no puede exceder 200 caracteres")
        .optional(),

    referencia: z
        .string()
        .max(100, "La referencia no puede exceder 100 caracteres")
        .optional(),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type AjusteStockInput = z.infer<typeof ajusteStockSchema>;
