import { z } from "zod";

export const legacyMigrationStepSchema = z.enum([
  "ORDERS",
  "PAYMENTS",
  "FULFILLMENTS",
]);

export const runLegacyMigrationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  dryRun: z.boolean().default(false),
  steps: z
    .array(legacyMigrationStepSchema)
    .min(1)
    .default(["ORDERS", "PAYMENTS", "FULFILLMENTS"]),
});

export type LegacyMigrationStep = z.infer<typeof legacyMigrationStepSchema>;
export type RunLegacyMigrationInput = z.infer<typeof runLegacyMigrationSchema>;
