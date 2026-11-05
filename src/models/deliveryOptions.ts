import { Schema, model, models } from "mongoose";

const pickupPointSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    costoBOB: { type: Number, default: 0 },
    costoEstimadoBOB: { type: Number, default: 0 },
    googleMapsUrl: { type: String, trim: true, default: undefined },
  },
  { _id: false }
);

const pickupScheduleSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    day: { type: String, required: true, trim: true },
    start: { type: String, required: true, trim: true },
    end: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    branches: {
      type: [{ type: String, required: true, trim: true }],
      default: [],
    },
    modalidadCobro: {
      type: String,
      enum: ["PAGO_EN_DESTINO", "TARIFA_FIJA", "POR_COORDINAR"],
      default: undefined,
    },
    costoEstimadoBOB: { type: Number, default: undefined },
    tiempoEstimadoHoras: { type: String, default: undefined },
    googleMapsUrl: { type: String, trim: true, default: undefined },
  },
  { _id: false }
);

const shippingCompanySchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    modalidadCobro: {
      type: String,
      enum: ["PAGO_EN_DESTINO", "TARIFA_FIJA", "POR_COORDINAR"],
      default: "PAGO_EN_DESTINO",
    },
    costoEstimadoBOB: { type: Number, default: 0 },
    tiempoEstimadoHoras: { type: String, default: "24 a 48 horas hábiles" },
    googleMapsUrl: { type: String, trim: true, default: undefined },
    departments: { type: [departmentSchema], default: [] },
  },
  { _id: false }
);

const deliveryOptionsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: "default",
    },
    pickupPoints: { type: [pickupPointSchema], default: [] },
    pickupSchedules: { type: [pickupScheduleSchema], default: [] },
    shippingCompanies: { type: [shippingCompanySchema], default: [] },
  },
  { timestamps: true }
);

const DeliveryOptionsModel =
  models.DeliveryOptions || model("DeliveryOptions", deliveryOptionsSchema);

export default DeliveryOptionsModel;
