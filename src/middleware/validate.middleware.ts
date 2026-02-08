import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

/**
 * Interfaz para el resultado de validación exitosa
 */
export interface ValidationSuccess<T> {
    success: true;
    data: T;
}

/**
 * Interfaz para el resultado de validación fallida
 */
export interface ValidationError {
    success: false;
    errors: Array<{
        field: string;
        message: string;
    }>;
}

/**
 * Tipo de resultado de validación
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * Valida el body de una request usando un schema de Zod
 * 
 * @param schema - Schema de Zod para validar
 * @param req - Request de Next.js
 * @returns Resultado de validación con datos o errores
 * 
 * @example
 * ```typescript
 * const result = await validateRequest(createUsuarioSchema, req);
 * if (!result.success) {
 *   return NextResponse.json(
 *     { message: "Datos inválidos", errors: result.errors },
 *     { status: 400 }
 *   );
 * }
 * const data = result.data; // Datos validados y tipados
 * ```
 */
export async function validateRequest<T>(
    schema: ZodSchema<T>,
    req: Request
): Promise<ValidationResult<T>> {
    try {
        const body = await req.json();
        const validated = schema.parse(body);

        return {
            success: true,
            data: validated,
        };
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                errors: error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            };
        }

        // Si no es un error de Zod, re-lanzar
        throw error;
    }
}

/**
 * Crea una respuesta de error de validación
 * 
 * @param errors - Array de errores de validación
 * @returns NextResponse con status 400
 * 
 * @example
 * ```typescript
 * if (!result.success) {
 *   return validationErrorResponse(result.errors);
 * }
 * ```
 */
export function validationErrorResponse(
    errors: Array<{ field: string; message: string }>
): NextResponse {
    return NextResponse.json(
        {
            message: "Datos inválidos",
            errors,
        },
        { status: 400 }
    );
}

/**
 * Middleware helper para validar y ejecutar
 * 
 * @param schema - Schema de Zod
 * @param req - Request
 * @param handler - Función a ejecutar con datos validados
 * @returns Response de Next.js
 * 
 * @example
 * ```typescript
 * export async function POST(req: Request) {
 *   return withValidation(createUsuarioSchema, req, async (data) => {
 *     const user = await createUser(data);
 *     return NextResponse.json(user, { status: 201 });
 *   });
 * }
 * ```
 */
export async function withValidation<T>(
    schema: ZodSchema<T>,
    req: Request,
    handler: (data: T) => Promise<NextResponse>
): Promise<NextResponse> {
    const result = await validateRequest(schema, req);

    if (!result.success) {
        return validationErrorResponse(result.errors);
    }

    return handler(result.data);
}
