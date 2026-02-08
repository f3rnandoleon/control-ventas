import { ZodError } from "zod";

/**
 * Obtiene el mensaje de error de un campo específico de un ZodError
 * 
 * @param error - ZodError
 * @param field - Nombre del campo
 * @returns Mensaje de error o string vacío
 * 
 * @example
 * ```typescript
 * const emailError = getFieldError(error, "email");
 * ```
 */
export function getFieldError(error: ZodError, field: string): string {
    const fieldError = error.issues.find((err) => err.path.join(".") === field);
    return fieldError?.message || "";
}

/**
 * Obtiene todos los mensajes de error de un ZodError
 * 
 * @param error - ZodError
 * @returns Objeto con campos y mensajes de error
 * 
 * @example
 * ```typescript
 * const errors = getAllErrors(error);
 * // { email: "Email inválido", password: "Contraseña muy corta" }
 * ```
 */
export function getAllErrors(error: ZodError): Record<string, string> {
    const errors: Record<string, string> = {};

    error.issues.forEach((err) => {
        const field = err.path.join(".");
        errors[field] = err.message;
    });

    return errors;
}

/**
 * Formatea errores de Zod para mostrar en UI
 * 
 * @param error - ZodError
 * @returns Array de objetos con campo y mensaje
 * 
 * @example
 * ```typescript
 * const formattedErrors = formatZodErrors(error);
 * // [{ field: "email", message: "Email inválido" }]
 * ```
 */
export function formatZodErrors(
    error: ZodError
): Array<{ field: string; message: string }> {
    return error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
    }));
}

/**
 * Verifica si un error es un ZodError
 * 
 * @param error - Error a verificar
 * @returns true si es ZodError
 */
export function isZodError(error: unknown): error is ZodError {
    return error instanceof ZodError;
}
