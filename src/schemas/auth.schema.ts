import { z } from "zod";

export const googleAuthSchema = z.object({
  idToken: z.string().trim().min(1, "El idToken de Google es obligatorio"),
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
