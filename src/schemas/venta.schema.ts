import { z } from "zod";
import {
    objectIdSchema,
    nonEmptyStringSchema,
    positiveIntegerSchema,
    metodoPagoSchema,
    tipoVentaSchema,
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
// SCHEMAS DE VENTA
// ============================================

/**
 * Schema para item de venta
 */
export const createVentaItemSchema = z.object({
    productoId: objectIdSchema,

    variantId: optionalObjectIdSchema,

    color: nonEmptyStringSchema
        .max(50, "El color no puede exceder 50 caracteres"),

    talla: nonEmptyStringSchema
        .max(20, "La talla no puede exceder 20 caracteres"),

    cantidad: positiveIntegerSchema
        .max(1000, "La cantidad no puede exceder 1000 unidades"),
});

export const deliverySchema = z.object({
    method: z.enum(["WHATSAPP", "PICKUP_LAPAZ", "HOME_DELIVERY"]),
    pickupPoint: z.enum(["TELEFERICO_MORADO", "TELEFERICO_ROJO", "CORREOS"]).nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
    if (data.method === "PICKUP_LAPAZ" && !data.pickupPoint) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El punto de recojo es obligatorio",
            path: ["pickupPoint"],
        });
    }
    if (data.method === "PICKUP_LAPAZ" && !data.phone) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El teléfono es obligatorio",
            path: ["phone"],
        });
    }
    if (data.method === "HOME_DELIVERY" && !data.address) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La dirección es obligatoria",
            path: ["address"],
        });
    }
    if (data.method === "HOME_DELIVERY" && !data.phone) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El teléfono es obligatorio",
            path: ["phone"],
        });
    }
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

    delivery: deliverySchema.optional(),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type CreateVentaItemInput = z.infer<typeof createVentaItemSchema>;
export type CreateVentaInput = z.infer<typeof createVentaSchema>;
