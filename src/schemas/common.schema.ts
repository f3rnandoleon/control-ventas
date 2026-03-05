import { z } from "zod";

// ============================================
// VALIDACIONES COMUNES REUTILIZABLES
// ============================================

/**
 * Email válido
 */
/**
 * Email válido
 */
/**
 * Email válido
 */
export const emailSchema = z
  .string()
  .min(1, "El email es requerido")
  .email("El email no es válido")
  .toLowerCase()
  .trim();

/**
 * Password - mínimo 6 caracteres
 */
export const passwordSchema = z
  .string()
  .min(1, "La contraseña es requerida")
  .min(6, "La contraseña debe tener al menos 6 caracteres")
  .max(100, "La contraseña es demasiado larga");

/**
 * ObjectId de MongoDB (24 caracteres hexadecimales)
 */
export const objectIdSchema = z
  .string()
  .min(1, "ID es requerido")
  .regex(/^[0-9a-fA-F]{24}$/, "ID no válido");

/**
 * Roles de usuario
 */
/**
 * Roles de usuario
 */
export const userRoleSchema = z.enum(["ADMIN", "VENDEDOR", "CLIENTE"]);

/**
 * Métodos de pago
 */
export const metodoPagoSchema = z.enum(["EFECTIVO", "QR"]);

/**
 * Tipos de venta
 */
export const tipoVentaSchema = z.enum(["WEB", "APP_QR", "TIENDA"]);

/**
 * Estados de venta
 */
export const estadoVentaSchema = z.enum(["PAGADA", "PENDIENTE", "CANCELADA"]);

/**
 * Tipos de movimiento de inventario
 */
export const tipoMovimientoSchema = z.enum(["ENTRADA", "SALIDA", "AJUSTE", "DEVOLUCION"]);

/**
 * Número positivo
 */
export const positiveNumberSchema = z
  .number()
  .positive("El valor debe ser positivo");

/**
 * Número no negativo (puede ser 0)
 */
export const nonNegativeNumberSchema = z
  .number()
  .nonnegative("El valor no puede ser negativo");

/**
 * Entero positivo
 */
export const positiveIntegerSchema = z
  .number()
  .int("Debe ser un número entero")
  .positive("El valor debe ser positivo");

/**
 * Entero no negativo
 */
export const nonNegativeIntegerSchema = z
  .number()
  .int("Debe ser un número entero")
  .nonnegative("El valor no puede ser negativo");

/**
 * String no vacío
 */
export const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, "Este campo es requerido");

/**
 * Fecha ISO string
 */
export const isoDateSchema = z
  .string()
  .datetime({ message: "Fecha no válida" });
