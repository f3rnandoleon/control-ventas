import { z } from "zod";
import {
  nonEmptyStringSchema,
  nonNegativeNumberSchema,
  objectIdSchema,
  positiveIntegerSchema,
} from "./common.schema";

const nullableDateSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return null;
    return value;
  },
  z.union([z.string(), z.date()]).nullable().optional()
);

const nullablePositiveIntSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return null;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  },
  z.number().int().positive("Debe ser un entero mayor a 0").nullable().optional()
);

const nullablePositiveNumberSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return null;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  },
  z.number().positive("Debe ser mayor a 0").nullable().optional()
);

export const reglaNxMSchema = z
  .object({
    lleva: z.number().int().min(2, "Debe llevar al menos 2 prendas"),
    paga: z.number().int().min(1, "Debe pagar al menos 1 prenda"),
  })
  .refine((data) => data.paga < data.lleva, {
    message: "La cantidad que paga debe ser menor a la que lleva (ej. 3x2 o 2x1)",
    path: ["paga"],
  });

export const condicionesPromocionSchema = z.object({
  montoMinimoCompra: nonNegativeNumberSchema.optional().default(0),
  cantidadMinimaPrendas: z.number().int().nonnegative().optional().default(0),
  soloPrimeraCompra: z.boolean().optional().default(false),
});

const promocionBaseSchema = z.object({
  nombre: nonEmptyStringSchema.min(3, "Mínimo 3 caracteres").max(120, "Máximo 120 caracteres"),
  descripcion: z.string().trim().max(400).optional().default(""),
  estado: z.enum(["BORRADOR", "ACTIVA", "PAUSADA", "FINALIZADA"]).optional().default("ACTIVA"),
  canales: z
    .array(z.enum(["WEB", "WHATSAPP"]))
    .min(1, "Seleccione al menos un canal")
    .optional()
    .default(["WEB"]),
  metodoActivacion: z.enum(["AUTOMATICA", "CUPON"]).default("AUTOMATICA"),
  tipo: z.enum(["PORCENTAJE", "MONTO_FIJO", "NXM", "SEGUNDA_UNIDAD", "ENVIO_GRATIS"]),
  valor: nonNegativeNumberSchema.optional().default(0),
  reglaNxM: reglaNxMSchema.nullable().optional().default(null),
  descuentoMaximo: nullablePositiveNumberSchema,
  alcance: z.enum(["PEDIDO", "PRODUCTOS", "CATEGORIAS", "ENVIO"]).default("PEDIDO"),
  productosIncluidos: z.array(objectIdSchema).optional().default([]),
  categoriasIncluidas: z.array(z.string().trim().min(1)).optional().default([]),
  productosExcluidos: z.array(objectIdSchema).optional().default([]),
  condiciones: condicionesPromocionSchema.optional().default({
    montoMinimoCompra: 0,
    cantidadMinimaPrendas: 0,
    soloPrimeraCompra: false,
  }),
  prioridad: z.number().int().min(1).max(1000).optional().default(10),
  acumulable: z.boolean().optional().default(false),
  acumulableConRebajasCatalogo: z.boolean().optional().default(false),
  fechaInicio: nullableDateSchema,
  fechaFin: nullableDateSchema,
  usoMaximoTotal: nullablePositiveIntSchema,
  usoMaximoPorCliente: nullablePositiveIntSchema,
});

function validatePromocionBusinessRules(
  data: Partial<z.infer<typeof promocionBaseSchema>>,
  ctx: z.RefinementCtx
) {
  if (data.tipo === "PORCENTAJE" || data.tipo === "SEGUNDA_UNIDAD") {
    const val = data.valor ?? 0;
    if (val <= 0 || val > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El porcentaje debe estar entre 1 y 100",
        path: ["valor"],
      });
    }
  }

  if (data.tipo === "MONTO_FIJO" && (data.valor ?? 0) <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El monto fijo debe ser mayor a 0",
      path: ["valor"],
    });
  }

  if (data.tipo === "NXM" && !data.reglaNxM) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe definir la regla NxM (lleva / paga)",
      path: ["reglaNxM"],
    });
  }

  if (data.alcance === "PRODUCTOS" && (!data.productosIncluidos || data.productosIncluidos.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Seleccione al menos un producto para el alcance PRODUCTOS",
      path: ["productosIncluidos"],
    });
  }

  if (data.alcance === "CATEGORIAS" && (!data.categoriasIncluidas || data.categoriasIncluidas.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Seleccione al menos una categoría para el alcance CATEGORIAS",
      path: ["categoriasIncluidas"],
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
}

export const createPromocionSchema = promocionBaseSchema.superRefine(validatePromocionBusinessRules);

export const updatePromocionSchema = promocionBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.tipo) {
      validatePromocionBusinessRules(data, ctx);
    } else if (data.fechaInicio && data.fechaFin) {
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

export const createCuponSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(3, "El código debe tener al menos 3 caracteres")
    .max(40, "El código no puede exceder 40 caracteres")
    .regex(/^[A-Za-z0-9_-]+$/, "Solo letras, números, guion y guion bajo")
    .transform((v) => v.toUpperCase()),
  promocionId: objectIdSchema,
  activo: z.boolean().optional().default(true),
  usoMaximoTotal: nullablePositiveIntSchema,
  usoMaximoPorCliente: nullablePositiveIntSchema,
});

export const updateCuponSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(3, "El código debe tener al menos 3 caracteres")
    .max(40, "El código no puede exceder 40 caracteres")
    .regex(/^[A-Za-z0-9_-]+$/, "Solo letras, números, guion y guion bajo")
    .transform((v) => v.toUpperCase())
    .optional(),
  promocionId: objectIdSchema.optional(),
  activo: z.boolean().optional(),
  usoMaximoTotal: nullablePositiveIntSchema,
  usoMaximoPorCliente: nullablePositiveIntSchema,
});

export const applyCouponSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(2, "Ingrese un código de cupón válido")
    .max(40, "Código demasiado largo")
    .transform((v) => v.toUpperCase()),
});

export const evaluatePromotionsItemSchema = z.object({
  productoId: objectIdSchema,
  varianteId: z.string().trim().optional().nullable(),
  variantId: z.string().trim().optional().nullable(),
  color: z.string().trim().min(1).max(50),
  colorSecundario: z.string().trim().max(50).optional(),
  talla: z.string().trim().min(1).max(20),
  cantidad: positiveIntegerSchema.max(1000),
});

export const evaluatePromotionsSchema = z.object({
  items: z.array(evaluatePromotionsItemSchema).min(1, "Debe enviar al menos un ítem"),
  cuponCodigo: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .transform((v) => (v ? v.toUpperCase() : null)),
  costoEnvio: nonNegativeNumberSchema.optional().default(0),
  telefonoInvitado: z.string().trim().max(25).optional().nullable(),
});

export type CreatePromocionInput = z.infer<typeof createPromocionSchema>;
export type UpdatePromocionInput = z.infer<typeof updatePromocionSchema>;
export type CreateCuponInput = z.infer<typeof createCuponSchema>;
export type UpdateCuponInput = z.infer<typeof updateCuponSchema>;
export type EvaluatePromotionsInput = z.infer<typeof evaluatePromotionsSchema>;
