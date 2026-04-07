import { z } from "zod";

export const runCoreVerificationSchema = z.object({
  cleanup: z.boolean().default(true),
  runLegacyMigration: z.boolean().default(true),
  legacyMigrationLimit: z.coerce.number().int().min(1).max(1000).default(500),
});

export type RunCoreVerificationInput = z.infer<
  typeof runCoreVerificationSchema
>;
