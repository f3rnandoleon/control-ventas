import type { ClientSession } from "mongoose";
import PaymentTransaction from "@/models/paymentTransaction";

export const paymentsRepository = {
  create(payload: Record<string, unknown>, session?: ClientSession) {
    return PaymentTransaction.create([payload], session ? { session } : {}).then(
      ([payment]) => payment
    );
  },

  findById(id: string, session?: ClientSession) {
    return PaymentTransaction.findById(id).session(session ?? null);
  },

  findByIdempotencyKey(idempotencyKey: string, session?: ClientSession) {
    return PaymentTransaction.findOne({ idempotencyKey }).session(session ?? null);
  },

  findLatestPaidByOrder(orderId: string, session?: ClientSession) {
    return PaymentTransaction.findOne({
      orderId,
      status: "PAID",
    })
      .session(session ?? null)
      .sort({ createdAt: -1 });
  },

  updateById(id: string, payload: Record<string, unknown>, session?: ClientSession) {
    return PaymentTransaction.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, session }
    );
  },

  findByReviewToken(token: string, session?: ClientSession) {
    return PaymentTransaction.findOne({ reviewToken: token }).session(session ?? null);
  },
};
