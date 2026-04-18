import { Schema, model, models, Types } from "mongoose";

const customerProfileSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    documentType: {
      type: String,
      enum: ["CI", "NIT", "PASAPORTE", "OTRO", null],
      default: null,
    },
    documentNumber: {
      type: String,
      trim: true,
      default: null,
    },
    defaultDeliveryMethod: {
      type: String,
      enum: ["WHATSAPP", "PICKUP_LAPAZ", "HOME_DELIVERY", null],
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const CustomerProfile =
  models.CustomerProfile ||
  model("CustomerProfile", customerProfileSchema);

export default CustomerProfile;
