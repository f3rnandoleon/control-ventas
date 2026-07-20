import DeliveryOptionsModel from "@/models/deliveryOptions";
import type { DeliveryOptionsInput } from "@/schemas/delivery-options.schema";

const DEFAULT_KEY = "default";

export const deliveryOptionsRepository = {
  findDefault() {
    return DeliveryOptionsModel.findOne({ key: DEFAULT_KEY }).lean();
  },

  replaceDefault(options: DeliveryOptionsInput) {
    return DeliveryOptionsModel.findOneAndUpdate(
      { key: DEFAULT_KEY },
      {
        $set: {
          pickupPoints: options.pickupPoints,
          pickupSchedules: options.pickupSchedules,
          shippingCompanies: options.shippingCompanies,
        },
        $setOnInsert: { key: DEFAULT_KEY },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();
  },
};
