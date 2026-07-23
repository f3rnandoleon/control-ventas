import { z } from "zod";
import { metodoPagoSchema } from "../../../schemas/common.schema";
import {
  createPedidoItemSchema,
  updatePedidoEntregaSchema,
} from "../../../schemas/pedido.schema";

export const POS_SALE_CHANNELS = ["APP_QR", "TIENDA"] as const;

export type PosSaleChannel = (typeof POS_SALE_CHANNELS)[number];

export const posSaleDeliverySchema = updatePedidoEntregaSchema.superRefine(
  (delivery, ctx) => {
    const metodo = delivery.metodo;

    if (!metodo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El metodo de entrega es obligatorio",
        path: ["metodo"],
      });
      return;
    }

    if (metodo === "PICKUP_POINT") {
      if (!delivery.puntoRecojo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El punto de recojo es obligatorio",
          path: ["puntoRecojo"],
        });
      }

      if (!delivery.telefono) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El telefono es obligatorio para el punto de recojo",
          path: ["telefono"],
        });
      }

      if (!delivery.nombreDestinatario) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del destinatario es obligatorio",
          path: ["nombreDestinatario"],
        });
      }
    }

    if (metodo === "SHIPPING_NATIONAL") {
      if (!delivery.departamento) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El departamento destino es obligatorio",
          path: ["departamento"],
        });
      }

      if (!delivery.empresaEnvio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La empresa de envio es obligatoria",
          path: ["empresaEnvio"],
        });
      }

      if (!delivery.nombreRemitente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del remitente es obligatorio",
          path: ["nombreRemitente"],
        });
      }

      if (!delivery.ciRemitente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El carnet del remitente es obligatorio",
          path: ["ciRemitente"],
        });
      }

      if (!delivery.telefonoRemitente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El telefono del remitente es obligatorio",
          path: ["telefonoRemitente"],
        });
      }

      if (!delivery.nombreDestinatario) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del destinatario es obligatorio",
          path: ["nombreDestinatario"],
        });
      }
    }
  }
);

export const createPosSaleSchemaShared = z.object({
  items: z
    .array(createPedidoItemSchema)
    .min(1, "Debe agregar al menos un producto a la venta"),
  metodoPago: metodoPagoSchema,
  descuento: z
    .number()
    .nonnegative("El descuento no puede ser negativo")
    .default(0)
    .optional(),
  delivery: posSaleDeliverySchema.optional(),
});

export type CreatePosSaleInputShared = z.infer<typeof createPosSaleSchemaShared>;

export function resolvePosSaleChannel(
  delivery: CreatePosSaleInputShared["delivery"]
): PosSaleChannel {
  return delivery ? "APP_QR" : "TIENDA";
}

export function buildPosSalesFilter(vendedorId: string) {
  return {
    vendedor: vendedorId,
    canal: { $in: [...POS_SALE_CHANNELS] },
  };
}
