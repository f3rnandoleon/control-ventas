import { randomBytes } from "crypto";

/**
 * Genera un ID secuencial único combinando timestamp + entropía aleatoria.
 * Formato: PREFIX-TIMESTAMP_BASE36-RANDOM4
 * Ejemplo: O-lp3k8f2a-3f9b
 */
export function generateOrderedId(prefix: string): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = randomBytes(3).toString("hex").toUpperCase();
    return `${prefix}-${ts}-${rand}`;
}
