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

export const guestClientSchema = z.object({
  nombreCompleto: z
    .string()
    .trim()
    .min(3, "El nombre completo debe tener al menos 3 caracteres"),
  telefono: z
    .string()
    .trim()
    .min(7, "El teléfono debe tener al menos 7 caracteres"),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  ci: z.string().trim().optional(),
});

export const checkoutItemSchema = z.object({
  productoId: z.string().trim().min(1, "El ID de producto es obligatorio"),
  variantId: z.string().trim().optional().nullable(),
  color: nonEmptyStringSchema.max(50, "El color no puede exceder 50 caracteres"),
  talla: nonEmptyStringSchema.max(20, "La talla no puede exceder 20 caracteres"),
  cantidad: positiveIntegerSchema.max(1000, "La cantidad no puede exceder 1000"),
  precio: z.number().positive("El precio debe ser positivo"),
});

export const checkoutCartSchema = z
  .object({
    esInvitado: z.boolean().optional(),
    clienteInvitado: guestClientSchema.optional(),
    items: z.array(checkoutItemSchema).optional(),
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
    const isGuest = Boolean(data.esInvitado || data.clienteInvitado);

    if (data.esInvitado && !data.clienteInvitado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los datos del cliente invitado son obligatorios",
        path: ["clienteInvitado"],
      });
    }

    if (isGuest && (!data.items || data.items.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los items son obligatorios para la compra como invitado",
        path: ["items"],
      });
    }

    const metodo = data.entrega?.metodo;

    if (metodo === "PICKUP_POINT") {
      const telefonoContacto = data.entrega?.telefono || data.clienteInvitado?.telefono;
      if (!telefonoContacto) {
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
      const nombreDestino = data.entrega?.nombreRemitente || data.clienteInvitado?.nombreCompleto;
      if (!nombreDestino) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del remitente es obligatorio",
          path: ["entrega", "nombreRemitente"],
        });
      }
      const ciDestino = data.entrega?.ciRemitente || data.clienteInvitado?.ci;
      if (!ciDestino) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El carnet del remitente es obligatorio",
          path: isGuest ? ["clienteInvitado", "ci"] : ["entrega", "ciRemitente"],
        });
      }
      const telefonoDestino = data.entrega?.telefonoRemitente || data.clienteInvitado?.telefono;
      if (!telefonoDestino) {
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
