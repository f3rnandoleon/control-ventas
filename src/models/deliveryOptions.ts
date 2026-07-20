import { Schema, model, models } from "mongoose";

const pickupPointSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
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
  },
  { _id: false }
);

const shippingCompanySchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
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
