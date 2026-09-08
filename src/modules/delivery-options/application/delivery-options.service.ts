import { connectDB } from "@/libs/mongodb";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { deliveryOptionsRepository } from "@/modules/delivery-options/infrastructure/delivery-options.repository";
import type { DeliveryOptionsInput } from "@/schemas/delivery-options.schema";
import { AppError } from "@/shared/errors/AppError";

type DeliveryOptionsDocument = DeliveryOptionsInput & {
  _id: { toString(): string };
};

export type ShippingPolicy = {
  nationalFlatFee: number;
  currency: string;
  estimatedTime: string | null;
};

export type DeliveryOptionsResponse = DeliveryOptionsInput & {
  shippingPolicy: ShippingPolicy;
};

const NATIONAL_SHIPPING_POLICY: ShippingPolicy = {
  nationalFlatFee: 10,
  currency: "BOB",
  estimatedTime: null,
};

function toResponse(document: DeliveryOptionsDocument): DeliveryOptionsResponse {
  return {
    pickupPoints: document.pickupPoints,
    pickupSchedules: document.pickupSchedules,
    shippingCompanies: document.shippingCompanies,
    shippingPolicy: NATIONAL_SHIPPING_POLICY,
  };
}

function summarize(options: DeliveryOptionsInput) {
  return {
    pickupPoints: options.pickupPoints.length,
    pickupSchedules: options.pickupSchedules.length,
    shippingCompanies: options.shippingCompanies.length,
    departments: options.shippingCompanies.reduce(
      (total, company) => total + company.departments.length,
      0
    ),
    branches: options.shippingCompanies.reduce(
      (total, company) =>
        total + company.departments.reduce((subtotal, department) => subtotal + department.branches.length, 0),
      0
    ),
  };
}

export async function getDeliveryOptions(): Promise<DeliveryOptionsResponse> {
  await connectDB();
  const document = await deliveryOptionsRepository.findDefault();

  if (!document) {
    throw new AppError(
      "Las opciones de entrega aun no fueron migradas a MongoDB",
      503,
      "DELIVERY_OPTIONS_NOT_CONFIGURED"
    );
  }

  return toResponse(document as unknown as DeliveryOptionsDocument);
}

export async function replaceDeliveryOptions(
  options: DeliveryOptionsInput,
  actor: { id: string; rol: "ADMIN" }
): Promise<DeliveryOptionsInput> {
  await connectDB();

  const previous = await deliveryOptionsRepository.findDefault();
  const updated = await deliveryOptionsRepository.replaceDefault(options);

  if (!updated) {
    throw new AppError("No se pudieron guardar las opciones de entrega", 500);
  }

  const updatedDocument = updated as unknown as DeliveryOptionsDocument;

  await recordAuditEventSafe({
    accion: "DELIVERY_OPTIONS_UPDATED",
    tipoEntidad: "DELIVERY_OPTIONS",
    idEntidad: updatedDocument._id.toString(),
    idActor: actor.id,
    rolActor: actor.rol,
    estado: "SUCCESS",
    metadata: {
      previous: previous ? summarize(previous as unknown as DeliveryOptionsInput) : null,
      current: summarize(options),
    },
  });

  return toResponse(updatedDocument);
}
