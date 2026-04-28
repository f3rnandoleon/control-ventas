import { z } from "zod";
import {
  nonEmptyStringSchema,
  objectIdSchema,
  positiveIntegerSchema,
} from "./common.schema";

const optionalObjectIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  objectIdSchema.optional()
);

const optionalStr = (max: number) =>
  z.string().trim().max(max).optional().nullable();

export const addCartItemSchema = z.object({
  productoId: objectIdSchema,
  varianteId: optionalObjectIdSchema,
  color: nonEmptyStringSchema.max(50, "El color no puede exceder 50 caracteres"),
  colorSecundario: z
    .string()
    .trim()
    .max(50, "El color secundario no puede exceder 50 caracteres")
    .optional(),
  talla: nonEmptyStringSchema.max(20, "La talla no puede exceder 20 caracteres"),
  cantidad: positiveIntegerSchema.max(1000, "La cantidad no puede exceder 1000"),
});

export const updateCartItemSchema = z.object({
  cantidad: positiveIntegerSchema.max(1000, "La cantidad no puede exceder 1000"),
});

export const checkoutCartSchema = z
  .object({
    metodoPago: z.enum(["EFECTIVO", "QR"]),
    direccionId: optionalObjectIdSchema,
    notas: nonEmptyStringSchema
      .max(300, "Las notas no pueden exceder 300 caracteres")
      .optional(),

    entrega: z
      .object({
        metodo: z.enum(["WHATSAPP", "PICKUP_POINT", "SHIPPING_NATIONAL"]),

        // PICKUP_POINT (Puntos de entrega)
        direccion: optionalStr(250),
        telefono: optionalStr(20),
        nombreDestinatario: optionalStr(100),
        programadoPara: optionalStr(100),

        // SHIPPING_NATIONAL (Otro departamento)
        departamento: optionalStr(100),
        ciudad: optionalStr(100),
        empresaEnvio: optionalStr(150),
        sucursal: optionalStr(150),
        nombreRemitente: optionalStr(100),
        ciRemitente: optionalStr(20),
        telefonoRemitente: optionalStr(20),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const metodo = data.entrega?.metodo;

    if (metodo === "PICKUP_POINT") {
      if (!data.entrega?.telefono) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El celular de contacto es obligatorio para el punto de encuentro",
          path: ["entrega", "telefono"],
        });
      }
      if (!data.entrega?.direccion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El lugar de encuentro es obligatorio",
          path: ["entrega", "direccion"],
        });
      }
    }

    if (metodo === "SHIPPING_NATIONAL") {
      if (data.metodoPago !== "QR") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El envío a otro departamento requiere pago por QR",
          path: ["metodoPago"],
        });
      }
      if (!data.entrega?.departamento) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El departamento destino es obligatorio",
          path: ["entrega", "departamento"],
        });
      }
      if (!data.entrega?.empresaEnvio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La empresa de transporte es obligatoria",
          path: ["entrega", "empresaEnvio"],
        });
      }
      if (!data.entrega?.nombreRemitente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del remitente es obligatorio",
          path: ["entrega", "nombreRemitente"],
        });
      }
      if (!data.entrega?.ciRemitente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El carnet del remitente es obligatorio",
          path: ["entrega", "ciRemitente"],
        });
      }
      if (!data.entrega?.telefonoRemitente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El celular del remitente es obligatorio",
          path: ["entrega", "telefonoRemitente"],
        });
      }
    }
  });

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CheckoutCartInput = z.infer<typeof checkoutCartSchema>;
