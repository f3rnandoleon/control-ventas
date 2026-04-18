import type { ClientSession } from "mongoose";
import Order from "@/models/order";

export const ordersRepository = {
  create(payload: Record<string, unknown>, session?: ClientSession) {
    return Order.create([payload], session ? { session } : {}).then(
      ([order]) => order
    );
  },

  listAll() {
    return Order.find()
      .populate("customer", "fullname email")
      .populate("seller", "fullname email")
      .sort({ createdAt: -1 });
  },

  listByCustomer(userId: string) {
    return Order.find({ customer: userId })
      .populate("customer", "fullname email")
      .populate("seller", "fullname email")
      .sort({ createdAt: -1 });
  },

  findById(id: string, session?: ClientSession) {
    return Order.findById(id)
      .session(session ?? null)
      .populate("customer", "fullname email")
      .populate("seller", "fullname email");
  },

  findByIdForCustomer(id: string, customerId: string, session?: ClientSession) {
    return Order.findOne({ _id: id, customer: customerId })
      .session(session ?? null)
      .populate("customer", "fullname email")
      .populate("seller", "fullname email");
  },

  updateById(id: string, payload: Record<string, unknown>, session?: ClientSession) {
    return Order.findByIdAndUpdate(id, { $set: payload }, { new: true, session })
      .populate("customer", "fullname email")
      .populate("seller", "fullname email");
  },

  findExpiredReserved(limit = 100) {
    return Order.find({
      stockReservationStatus: "RESERVED",
      reservationExpiresAt: { $lt: new Date() },
    })
      .sort({ reservationExpiresAt: 1 })
      .limit(limit);
  },

  findBySourceSaleIds(sourceSaleIds: string[]) {
    return Order.find({
      sourceSaleId: { $in: sourceSaleIds },
    }).select("sourceSaleId");
  },
};
