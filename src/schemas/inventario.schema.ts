import { z } from "zod";
import {
    objectIdSchema,
    nonEmptyStringSchema,
    tipoMovimientoSchema,
} from "./common.schema";

const optionalObjectIdSchema = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    },
    objectIdSchema.optional()
);

// ============================================
// SCHEMAS DE INVENTARIO
// ============================================

/**
 * Schema para ajuste de stock
 */
export const ajusteStockSchema = z.object({
    productoId: objectIdSchema,

    varianteId: optionalObjectIdSchema,

    sucursalId: optionalObjectIdSchema,

    color: nonEmptyStringSchema
        .max(50, "El color no puede exceder 50 caracteres"),

    colorSecundario: z.string()
        .trim()
        .max(50, "El color secundario no puede exceder 50 caracteres")
        .optional(),

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

const optionalVariantIdSchema = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    },
    z.string().min(1).max(100).optional()
);

/**
 * Schema para reclasificar prendas entre variantes (ej. cambio de talla L -> M, XL, S o cambio de color)
 */
export const reclasificarVarianteSchema = z
    .object({
        productoId: objectIdSchema,
        sucursalId: optionalObjectIdSchema,

        // Variante origen
        varianteOrigenId: optionalVariantIdSchema,
        origenColor: z.string().trim().max(50).optional(),
        origenColorSecundario: z.string().trim().max(50).optional(),
        origenTalla: z.string().trim().max(20).optional(),

        // Variante destino (existente o nueva)
        varianteDestinoId: optionalVariantIdSchema,
        crearNuevaVariante: z.boolean().optional().default(false),
        destinoColor: z.string().trim().max(50).optional(),
        destinoColorSecundario: z.string().trim().max(50).optional(),
        destinoTalla: z.string().trim().max(20).optional(),

        cantidad: z.coerce
            .number()
            .int("La cantidad debe ser un número entero")
            .min(1, "La cantidad debe ser al menos 1"),

        motivo: z
            .string()
            .trim()
            .max(200, "El motivo no puede exceder 200 caracteres")
            .optional(),

        referencia: z
            .string()
            .trim()
            .max(100, "La referencia no puede exceder 100 caracteres")
            .optional(),
    })
    .superRefine((data, ctx) => {
        if (!data.varianteOrigenId && (!data.origenColor || !data.origenTalla)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["varianteOrigenId"],
                message: "Debes especificar la variante origen",
            });
        }

        if (!data.varianteDestinoId && (!data.destinoTalla || data.destinoTalla.trim() === "")) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["destinoTalla"],
                message: "Debes seleccionar una variante destino o indicar la nueva talla",
            });
        }
    });

// ============================================
// TIPOS INFERIDOS
// ============================================

export type AjusteStockInput = z.infer<typeof ajusteStockSchema>;
export type ReclasificarVarianteInput = z.infer<typeof reclasificarVarianteSchema>;
