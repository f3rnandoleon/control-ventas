import { z } from "zod";
import {
    nonEmptyStringSchema,
    positiveNumberSchema,
    nonNegativeIntegerSchema,
} from "./common.schema";

const optionalObjectIdSchema = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    },
    z.string().regex(/^[0-9a-fA-F]{24}$/, "ID no valido").optional()
);

const varianteImageValueSchema = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    },
    z.union([
        z.string().url("La imagen debe ser una URL valida"),
        z.string().regex(
            /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
            "La imagen debe ser una URL valida o una imagen base64 valida"
        ),
    ])
);

// ============================================
// SCHEMAS DE PRODUCTO
// ============================================

/**
 * Schema para variante de producto
 */
export const varianteSchema = z.object({
    variantId: optionalObjectIdSchema,

    color: nonEmptyStringSchema
        .max(50, "El color no puede exceder 50 caracteres"),

    talla: nonEmptyStringSchema
        .max(20, "La talla no puede exceder 20 caracteres"),

    stock: nonNegativeIntegerSchema,

    reservedStock: nonNegativeIntegerSchema.optional(),

    imagenes: z.array(varianteImageValueSchema).optional().default([]),

    imagen: varianteImageValueSchema.optional(),

    descripcion: z.string().optional(),

    codigoBarra: z.string().optional(),

    qrCode: z.string().optional(),
});

/**
 * Schema para crear un producto
 */
export const createProductoSchema = z.object({
    nombre: nonEmptyStringSchema
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(100, "El nombre no puede exceder 100 caracteres"),

    modelo: nonEmptyStringSchema
        .min(2, "El modelo debe tener al menos 2 caracteres")
        .max(50, "El modelo no puede exceder 50 caracteres"),

    precioVenta: positiveNumberSchema,

    precioCosto: positiveNumberSchema,

    categoria: z.string().optional().default("Chompas"),

    variantes: z
        .array(varianteSchema)
        .optional()
        .default([]),
}).refine(
    (data) => data.precioVenta > data.precioCosto,
    {
        message: "El precio de venta debe ser mayor al precio de costo",
        path: ["precioVenta"],
    }
);

/**
 * Schema para actualizar un producto
 */
export const updateProductoSchema = z.object({
    nombre: nonEmptyStringSchema
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(100, "El nombre no puede exceder 100 caracteres")
        .optional(),

    modelo: nonEmptyStringSchema
        .min(2, "El modelo debe tener al menos 2 caracteres")
        .max(50, "El modelo no puede exceder 50 caracteres")
        .optional(),

    precioVenta: positiveNumberSchema.optional(),

    precioCosto: positiveNumberSchema.optional(),

    categoria: z.string().optional(),

    variantes: z
        .array(varianteSchema)
        .optional(),
}).refine(
    (data) => {
        if (data.precioVenta && data.precioCosto) {
            return data.precioVenta > data.precioCosto;
        }
        return true;
    },
    {
        message: "El precio de venta debe ser mayor al precio de costo",
        path: ["precioVenta"],
    }
);

// ============================================
// TIPOS INFERIDOS
// ============================================

export type VarianteInput = z.infer<typeof varianteSchema>;
export type CreateProductoInput = z.infer<typeof createProductoSchema>;
export type UpdateProductoInput = z.infer<typeof updateProductoSchema>;
