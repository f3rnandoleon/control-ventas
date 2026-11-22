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
 * Schema para entrada de guía de tallas a nivel de producto
 */
export const medidaTallaItemSchema = z.object({
    talla: nonEmptyStringSchema.max(20, "La talla no puede exceder 20 caracteres"),
    anchoPecho: positiveNumberSchema.optional(),
    anchoHombros: positiveNumberSchema.optional(),
    largoTotal: positiveNumberSchema.optional(),
    largoMangaAxila: positiveNumberSchema.optional(),
    largoMangaHombro: positiveNumberSchema.optional(),
});

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

export interface ProductWebDiscountIssue {
    path: (string | number)[];
    message: string;
}

export function getProductWebDiscountIssues(data: {
    precioVenta?: number | null;
    precioCosto?: number | null;
    rebajaWeb?: {
        activa?: boolean;
        tipo?: "PORCENTAJE" | "PRECIO_FIJO";
        valor?: number;
    } | null;
    variantes?: Array<{
        color?: string;
        talla?: string;
        precioVenta?: number | null;
        precioCosto?: number | null;
        precioOfertaWeb?: number | null;
    }>;
}): ProductWebDiscountIssue[] {
    const issues: ProductWebDiscountIssue[] = [];
    const basePrice = Number(data.precioVenta || 0);
    const baseCost = Number(data.precioCosto || 0);

    if (data.rebajaWeb?.activa && basePrice > 0) {
        const valor = Number(data.rebajaWeb.valor || 0);
        if (data.rebajaWeb.tipo === "PRECIO_FIJO" && valor >= basePrice) {
            issues.push({
                path: ["rebajaWeb", "valor"],
                message: "El precio oferta fijo debe ser menor al precio de venta",
            });
        }
        const effectiveWebPrice =
            data.rebajaWeb.tipo === "PRECIO_FIJO"
                ? valor
                : Number((basePrice * (1 - Math.min(95, Math.max(0, valor)) / 100)).toFixed(2));
        if (baseCost > 0 && effectiveWebPrice < baseCost) {
            issues.push({
                path: ["rebajaWeb", "valor"],
                message: "La rebaja web no puede dejar el precio por debajo del precio de costo",
            });
        }
    }

    (data.variantes || []).forEach((v, idx) => {
        const offer = v.precioOfertaWeb;
        if (offer !== null && offer !== undefined && Number(offer) > 0) {
            const varPrice = v.precioVenta && Number(v.precioVenta) > 0 ? Number(v.precioVenta) : basePrice;
            const varCost = v.precioCosto && Number(v.precioCosto) > 0 ? Number(v.precioCosto) : baseCost;
            const variantLabel = v.color && v.talla ? ` (${v.color}/${v.talla})` : "";
            if (varPrice > 0 && Number(offer) >= varPrice) {
                issues.push({
                    path: ["variantes", idx, "precioOfertaWeb"],
                    message: `El precio oferta web de la variante${variantLabel} debe ser menor al precio de venta`,
                });
            }
            if (varCost > 0 && Number(offer) < varCost) {
                issues.push({
                    path: ["variantes", idx, "precioOfertaWeb"],
                    message: `El precio oferta web de la variante${variantLabel} no puede ser menor al precio de costo`,
                });
            }
        }
    });

    return issues;
}

function validateWebDiscountsOnProduct(
    data: {
        precioVenta?: number;
        precioCosto?: number;
        rebajaWeb?: z.infer<typeof rebajaWebSchema> | null;
        variantes?: Array<z.infer<typeof varianteSchema>>;
    },
    ctx: z.RefinementCtx
) {
    for (const issue of getProductWebDiscountIssues(data)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: issue.message,
            path: issue.path,
        });
    }
}

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

    medidasPorTalla: z.array(medidaTallaItemSchema).optional(),

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
).superRefine(validateWebDiscountsOnProduct);

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

    medidasPorTalla: z.array(medidaTallaItemSchema).optional(),

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
).superRefine(validateWebDiscountsOnProduct);

// ============================================
// TIPOS INFERIDOS
// ============================================

export type VarianteInput = z.infer<typeof varianteSchema>;
export type CreateProductoInput = z.infer<typeof createProductoSchema>;
export type UpdateProductoInput = z.infer<typeof updateProductoSchema>;
