import type { ClientSession } from "mongoose";
import Fulfillment from "@/models/fulfillment";

export const fulfillmentRepository = {
  findById(id: string, session?: ClientSession) {
    return Fulfillment.findById(id)
      .session(session ?? null)
      .populate("customer", "fullname email")
      .populate("seller", "fullname email")
      .populate("assignedTo", "fullname email");
  },

  findByOrderId(orderId: string, session?: ClientSession) {
    return Fulfillment.findOne({ orderId })
      .session(session ?? null)
      .populate("customer", "fullname email")
      .populate("seller", "fullname email")
      .populate("assignedTo", "fullname email");
  },

  upsertByOrderId(
    orderId: string,
    payload: Record<string, unknown>,
    session?: ClientSession
  ) {
    return Fulfillment.findOneAndUpdate(
      { orderId },
      { $set: payload },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      }
    )
      .populate("customer", "fullname email")
      .populate("seller", "fullname email")
      .populate("assignedTo", "fullname email");
  },

  updateById(id: string, payload: Record<string, unknown>, session?: ClientSession) {
    return Fulfillment.findByIdAndUpdate(id, { $set: payload }, { new: true, session })
      .populate("customer", "fullname email")
      .populate("seller", "fullname email")
      .populate("assignedTo", "fullname email");
  },
};
