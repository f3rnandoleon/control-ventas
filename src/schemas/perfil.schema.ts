import { z } from "zod";
import {
  emailSchema,
  nonEmptyStringSchema,
  passwordSchema,
} from "./common.schema";

const optionalPerfilPasswordSchema = z
  .union([passwordSchema, z.literal("")])
  .transform((value) => (value === "" ? undefined : value));

export const updatePerfilSchema = z.object({
  nombreCompleto: nonEmptyStringSchema
    .min(3, "El nombre completo debe tener al menos 3 caracteres")
    .max(100, "El nombre completo no puede exceder 100 caracteres"),
  email: emailSchema,
  password: optionalPerfilPasswordSchema.optional(),
});

export type UpdatePerfilInput = z.infer<typeof updatePerfilSchema>;
