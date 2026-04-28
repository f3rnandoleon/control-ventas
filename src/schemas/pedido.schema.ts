import { z } from "zod";
import {
  objectIdSchema,
  nonEmptyStringSchema,
  positiveIntegerSchema,
  metodoPagoSchema,
  tipoVentaSchema,
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

export const estadoPedidoSchema = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
]);

export const estadoPagoSchema = z.enum([
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const estadoEntregaSchema = z.enum([
  "PENDING",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "NOT_APPLICABLE",
  "CANCELLED",
]);

export const updateEstadoPedidoSchema = z
  .object({
    estadoPedido: estadoPedidoSchema.optional(),
    estadoPago: estadoPagoSchema.optional(),
    estadoEntrega: estadoEntregaSchema.optional(),
  })
  .refine(
    (data) =>
      data.estadoPedido !== undefined ||
      data.estadoPago !== undefined ||
      data.estadoEntrega !== undefined,
    {
      message: "Debe enviar al menos un campo a actualizar",
    }
  );

export type UpdateEstadoPedidoInput = z.infer<typeof updateEstadoPedidoSchema>;

export const updatePedidoEntregaSchema = z.object({
  metodo: z.enum(["WHATSAPP", "PICKUP_POINT", "SHIPPING_NATIONAL"]).optional(),
  puntoRecojo: z.string().max(250).optional().nullable(),
  direccion: z.string().max(250).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  nombreDestinatario: z.string().max(100).optional().nullable(),
  programadoPara: z.string().max(100).optional().nullable(),
  departamento: z.string().max(100).optional().nullable(),
  ciudad: z.string().max(100).optional().nullable(),
  empresaEnvio: z.string().max(150).optional().nullable(),
  sucursal: z.string().max(150).optional().nullable(),
  nombreRemitente: z.string().max(100).optional().nullable(),
  ciRemitente: z.string().max(20).optional().nullable(),
  telefonoRemitente: z.string().max(20).optional().nullable(),
});

export type UpdatePedidoEntregaInput = z.infer<typeof updatePedidoEntregaSchema>;

export const createPedidoItemSchema = z.object({
  productoId: objectIdSchema,
  varianteId: optionalObjectIdSchema,
  color: nonEmptyStringSchema.max(50, "El color no puede exceder 50 caracteres"),
  colorSecundario: z
    .string()
    .trim()
    .max(50, "El color secundario no puede exceder 50 caracteres")
    .optional(),
  talla: nonEmptyStringSchema.max(20, "La talla no puede exceder 20 caracteres"),
  cantidad: positiveIntegerSchema.max(1000, "La cantidad no puede exceder 1000 unidades"),
});

export type CreatePedidoItemInput = z.infer<typeof createPedidoItemSchema>;

export const createPedidoSchema = z.object({
  items: z
    .array(createPedidoItemSchema)
    .min(1, "Debe agregar al menos un producto al pedido"),
  metodoPago: metodoPagoSchema,
  canal: tipoVentaSchema,
  descuento: z
    .number()
    .nonnegative("El descuento no puede ser negativo")
    .max(100, "El descuento no puede exceder el 100%")
    .default(0)
    .optional(),
});

export type CreatePedidoInput = z.infer<typeof createPedidoSchema>;
