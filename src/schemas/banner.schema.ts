import { z } from "zod";

export const bannerSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(2, "El título debe tener al menos 2 caracteres")
    .max(120, "El título no puede exceder 120 caracteres"),
  descripcion: z.string().trim().max(300, "La descripción no puede exceder 300 caracteres").optional(),
  imagenDesktopUrl: z
    .string()
    .trim()
    .url("La URL de la imagen desktop no es válida"),
  imagenMobileUrl: z
    .string()
    .trim()
    .url("La URL de la imagen mobile no es válida")
    .optional()
    .or(z.literal("")),
  tipoAccion: z.enum(["WHATSAPP", "URL_EXTERNA", "NINGUNA"]).default("WHATSAPP"),
  whatsappNumero: z
    .string()
    .trim()
    .default("67113105"),
  whatsappMensaje: z.string().trim().max(500).optional().or(z.literal("")),
  enlaceUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  activo: z.boolean().default(true),
  orden: z.coerce.number().int().default(0),
  fechaInicio: z.string().optional().nullable().or(z.literal("")),
  fechaFin: z.string().optional().nullable().or(z.literal("")),
});

export const updateBannerSchema = bannerSchema.partial();
export type BannerSchemaInput = z.infer<typeof bannerSchema>;
