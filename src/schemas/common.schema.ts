import { z } from "zod";

// ============================================
// VALIDACIONES COMUNES REUTILIZABLES
// ============================================

/**
 * Email válido
 */
export const emailSchema = z
  .string({ required_error: "El email es requerido" })
  .email("El email no es válido")
  .toLowerCase()
  .trim();

/**
 * Password - mínimo 6 caracteres
 */
export const passwordSchema = z
  .string({ required_error: "La contraseña es requerida" })
  .min(6, "La contraseña debe tener al menos 6 caracteres")
  .max(100, "La contraseña es demasiado larga");

/**
 * ObjectId de MongoDB (24 caracteres hexadecimales)
 */
export const objectIdSchema = z
  .string({ required_error: "ID es requerido" })
  .regex(/^[0-9a-fA-F]{24}$/, "ID no válido");

/**
 * Roles de usuario
 */
export const userRoleSchema = z.enum(["ADMIN", "VENDEDOR", "CLIENTE"], {
  errorMap: () => ({ message: "Rol no válido. Debe ser ADMIN, VENDEDOR o CLIENTE" }),
});

/**
 * Métodos de pago
 */
export const metodoPagoSchema = z.enum(["EFECTIVO", "QR"], {
  errorMap: () => ({ message: "Método de pago no válido. Debe ser EFECTIVO o QR" }),
});

/**
 * Tipos de venta
 */
export const tipoVentaSchema = z.enum(["WEB", "APP_QR", "TIENDA"], {
  errorMap: () => ({ message: "Tipo de venta no válido. Debe ser WEB, APP_QR o TIENDA" }),
});

/**
 * Estados de venta
 */
export const estadoVentaSchema = z.enum(["PAGADA", "PENDIENTE", "CANCELADA"], {
  errorMap: () => ({ message: "Estado no válido. Debe ser PAGADA, PENDIENTE o CANCELADA" }),
});

/**
 * Tipos de movimiento de inventario
 */
export const tipoMovimientoSchema = z.enum(["ENTRADA", "SALIDA", "AJUSTE", "DEVOLUCION"], {
  errorMap: () => ({ message: "Tipo de movimiento no válido" }),
});

/**
 * Número positivo
 */
export const positiveNumberSchema = z
  .number({ required_error: "El valor es requerido" })
  .positive("El valor debe ser positivo");

/**
 * Número no negativo (puede ser 0)
 */
export const nonNegativeNumberSchema = z
  .number({ required_error: "El valor es requerido" })
  .nonnegative("El valor no puede ser negativo");

/**
 * Entero positivo
 */
export const positiveIntegerSchema = z
  .number({ required_error: "El valor es requerido" })
  .int("Debe ser un número entero")
  .positive("El valor debe ser positivo");

/**
 * Entero no negativo
 */
export const nonNegativeIntegerSchema = z
  .number({ required_error: "El valor es requerido" })
  .int("Debe ser un número entero")
  .nonnegative("El valor no puede ser negativo");

/**
 * String no vacío
 */
export const nonEmptyStringSchema = z
  .string({ required_error: "Este campo es requerido" })
  .trim()
  .min(1, "Este campo no puede estar vacío");

/**
 * Fecha ISO string
 */
export const isoDateSchema = z
  .string()
  .datetime({ message: "Fecha no válida" });
