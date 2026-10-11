import { z } from "zod";

export const politicaItemSchema = z.object({
  titulo: z.string().trim().min(2, "El título debe tener al menos 2 caracteres"),
  contenido: z.string().trim().min(10, "El contenido debe tener al menos 10 caracteres"),
  version: z.string().trim().optional(),
  activo: z.boolean().optional(),
});

export const politicaDevolucionSchema = politicaItemSchema.extend({
  diasLimiteDevolucion: z.number().int().min(1, "Debe ser al menos 1 día").default(7),
});

export const politicaCookiesSchema = politicaItemSchema.extend({
  mostrarBanner: z.boolean().default(true),
  mensajeBanner: z.string().trim().min(5, "El mensaje del banner es obligatorio").max(300),
});

export const updateAjustesSchema = z.object({
  finanzas: z.object({
    tipoCambioPEN_BOB: z.number().positive("El tipo de cambio debe ser mayor a 0"),
  }),
  politicas: z.object({
    devoluciones: politicaDevolucionSchema,
    privacidad: politicaItemSchema,
    terminos: politicaItemSchema,
    cookies: politicaCookiesSchema,
  }),
});

export type UpdateAjustesInput = z.infer<typeof updateAjustesSchema>;
