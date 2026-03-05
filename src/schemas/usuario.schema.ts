import { z } from "zod";
import {
    emailSchema,
    passwordSchema,
    userRoleSchema,
    nonEmptyStringSchema,
} from "./common.schema";

// ============================================
// SCHEMAS DE USUARIO
// ============================================

/**
 * Schema para crear un nuevo usuario
 */
export const createUsuarioSchema = z.object({
    fullname: nonEmptyStringSchema
        .min(3, "El nombre completo debe tener al menos 3 caracteres")
        .max(100, "El nombre completo no puede exceder 100 caracteres"),

    email: emailSchema,

    password: passwordSchema,

    role: userRoleSchema.default("CLIENTE"),

    isActive: z.boolean().default(true),
});

/**
 * Schema para actualizar un usuario
 */
export const updateUsuarioSchema = z.object({
    fullname: nonEmptyStringSchema
        .min(3, "El nombre completo debe tener al menos 3 caracteres")
        .max(100, "El nombre completo no puede exceder 100 caracteres")
        .optional(),

    email: emailSchema.optional(),

    password: passwordSchema.optional(),

    role: userRoleSchema.optional(),

    isActive: z.boolean().optional(),
});

/**
 * Schema para login
 */
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "La contraseña es requerida"),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
