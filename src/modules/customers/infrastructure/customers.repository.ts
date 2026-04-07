import CustomerProfile from "@/models/customerProfile";
import CustomerAddress from "@/models/customerAddress";

export const customersRepository = {
  findProfileByUserId(userId: string) {
    return CustomerProfile.findOne({ userId });
  },

  upsertProfileByUserId(userId: string, payload: Record<string, unknown> = {}) {
    return CustomerProfile.findOneAndUpdate(
      { userId },
      {
        $set: payload,
        $setOnInsert: { userId },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  },

  listAddresses(profileId: string) {
    return CustomerAddress.find({
      customerProfileId: profileId,
      isActive: true,
    }).sort({ isDefault: -1, createdAt: -1 });
  },

  countActiveAddresses(profileId: string) {
    return CustomerAddress.countDocuments({
      customerProfileId: profileId,
      isActive: true,
    });
  },

  findAddressById(profileId: string, addressId: string) {
    return CustomerAddress.findOne({
      _id: addressId,
      customerProfileId: profileId,
    });
  },

  createAddress(payload: Record<string, unknown>) {
    return CustomerAddress.create(payload);
  },

  updateAddressById(
    profileId: string,
    addressId: string,
    payload: Record<string, unknown>
  ) {
    return CustomerAddress.findOneAndUpdate(
      { _id: addressId, customerProfileId: profileId },
      { $set: payload },
      { new: true }
    );
  },

  unsetDefaultAddresses(profileId: string, excludeId?: string) {
    return CustomerAddress.updateMany(
      {
        customerProfileId: profileId,
        isActive: true,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      },
      { $set: { isDefault: false } }
    );
  },

  findDefaultAddress(profileId: string) {
    return CustomerAddress.findOne({
      customerProfileId: profileId,
      isActive: true,
      isDefault: true,
    });
  },

  findFirstActiveAddress(profileId: string) {
    return CustomerAddress.findOne({
      customerProfileId: profileId,
      isActive: true,
    }).sort({ createdAt: 1 });
  },
};
