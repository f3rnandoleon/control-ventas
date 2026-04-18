import { Schema, model, models, Types } from "mongoose";

const customerAddressSchema = new Schema(
  {
    customerProfileId: {
      type: Types.ObjectId,
      ref: "CustomerProfile",
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    zone: {
      type: String,
      trim: true,
      default: null,
    },
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
      default: null,
    },
    postalCode: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: "Bolivia",
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

customerAddressSchema.index({
  customerProfileId: 1,
  isActive: 1,
  isDefault: -1,
  createdAt: -1,
});

const CustomerAddress =
  models.CustomerAddress ||
  model("CustomerAddress", customerAddressSchema);

export default CustomerAddress;
