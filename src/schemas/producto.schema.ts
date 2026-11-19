import { z } from "zod";
import {
    nonEmptyStringSchema,
    positiveNumberSchema,
    nonNegativeNumberSchema,
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

const optionalDateSchema = z.preprocess(
    (value) => {
        if (value === "" || value === undefined || value === null) {
            return null;
        }
        return value;
    },
    z.union([z.string(), z.date()]).nullable().optional()
);

/**
 * Schema para rebaja de catálogo exclusiva Web ("Antes / Ahora")
 */
export const rebajaWebSchema = z
    .object({
        activa: z.boolean().default(false),
        tipo: z.enum(["PORCENTAJE", "PRECIO_FIJO"]).default("PORCENTAJE"),
        valor: nonNegativeNumberSchema.default(0),
        fechaInicio: optionalDateSchema,
        fechaFin: optionalDateSchema,
    })
    .superRefine((data, ctx) => {
        if (data.activa && data.valor <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El valor de la rebaja web debe ser mayor a 0 cuando está activa",
                path: ["valor"],
            });
        }
        if (data.tipo === "PORCENTAJE" && data.valor > 95) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El porcentaje de rebaja web no puede superar el 95%",
                path: ["valor"],
            });
        }
        if (data.fechaInicio && data.fechaFin) {
            const inicio = new Date(data.fechaInicio);
            const fin = new Date(data.fechaFin);
            if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime()) && fin < inicio) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "La fecha fin debe ser posterior o igual a la fecha inicio",
                    path: ["fechaFin"],
                });
            }
        }
    });

/**
 * Schema para medidas de prenda (en centímetros)
 */
export const medidasPrendaSchema = z
    .object({
        anchoPecho: positiveNumberSchema.optional(),
        anchoHombros: positiveNumberSchema.optional(),
        largoTotal: positiveNumberSchema.optional(),
        largoMangaAxila: positiveNumberSchema.optional(),
        largoMangaHombro: positiveNumberSchema.optional(),
    })
    .optional();

/**
 * Schema para variante de producto
 */
export const varianteSchema = z.object({
    varianteId: optionalObjectIdSchema,

    color: nonEmptyStringSchema
        .max(50, "El color no puede exceder 50 caracteres"),

    colorSecundario: z.string()
        .trim()
        .max(50, "El color secundario no puede exceder 50 caracteres")
        .optional(),

    talla: nonEmptyStringSchema
        .max(20, "La talla no puede exceder 20 caracteres"),

    stock: nonNegativeIntegerSchema,

    stockReservado: nonNegativeIntegerSchema.optional(),

    imagenes: z.array(varianteImageValueSchema).optional().default([]),

    imagen: varianteImageValueSchema.optional(),

    descripcion: z.string().optional(),

    codigoBarra: z.string().optional(),

    qrCode: z.string().optional(),

    precioVenta: positiveNumberSchema.optional(),

    precioCosto: nonNegativeNumberSchema.optional(),

    precioOfertaWeb: z.preprocess(
        (value) => (value === "" || value === undefined ? null : value),
        nonNegativeNumberSchema.nullable().optional()
    ),

    medidas: medidasPrendaSchema,
}).refine(
    (data) => {
        if (data.precioVenta !== undefined && data.precioCosto !== undefined) {
            return data.precioVenta >= data.precioCosto;
        }
        return true;
    },
    {
        message: "El precio de venta de la variante debe ser mayor o igual al precio de costo",
        path: ["precioVenta"],
    }
);

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

    precioCosto: nonNegativeNumberSchema.optional().default(0),

    costoOrigen: z
        .object({
            moneda: z.enum(["PEN", "BOB", "USD"]).default("BOB"),
            montoOriginal: nonNegativeNumberSchema,
            tipoCambioAplicado: positiveNumberSchema,
            fechaRegistro: z.union([z.string(), z.date()]).optional(),
        })
        .optional(),

    categoria: z.string().optional().default("Chompas"),

    rebajaWeb: rebajaWebSchema.optional().nullable(),

    variantes: z
        .array(varianteSchema)
        .optional()
        .default([]),
}).refine(
    (data) => {
        // Solo validar si se ingresó un costo mayor a 0
        if (data.precioCosto && data.precioCosto > 0) {
            return data.precioVenta > data.precioCosto;
        }
        return true;
    },
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

    precioCosto: nonNegativeNumberSchema.optional(),

    costoOrigen: z
        .object({
            moneda: z.enum(["PEN", "BOB", "USD"]).default("BOB"),
            montoOriginal: nonNegativeNumberSchema,
            tipoCambioAplicado: positiveNumberSchema,
            fechaRegistro: z.union([z.string(), z.date()]).optional(),
        })
        .optional(),

    categoria: z.string().optional(),

    rebajaWeb: rebajaWebSchema.optional().nullable(),

    variantes: z
        .array(varianteSchema)
        .optional(),
}).refine(
    (data) => {
        if (data.precioVenta && data.precioCosto && data.precioCosto > 0) {
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
