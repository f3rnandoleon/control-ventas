import type { ClientSession } from "mongoose";
import TransaccionPago from "@/models/transaccionPago";

export const paymentsRepository = {
  create(payload: Record<string, unknown>, session?: ClientSession) {
    return TransaccionPago.create([payload], session ? { session } : {}).then(
      ([payment]) => payment
    );
  },

  findById(id: string, session?: ClientSession) {
    return TransaccionPago.findById(id).session(session ?? null);
  },

  findByIdempotencyKey(idempotencyKey: string, session?: ClientSession) {
    return TransaccionPago.findOne({ idempotencyKey }).session(session ?? null);
  },

  findLatestPaidByOrder(pedidoId: string, session?: ClientSession) {
    return TransaccionPago.findOne({
      pedidoId,
      estado: "PAID",
    })
      .session(session ?? null)
      .sort({ createdAt: -1 });
  },

  updateById(id: string, payload: Record<string, unknown>, session?: ClientSession) {
    return TransaccionPago.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, session }
    );
  },

  findByReviewTokenHash(tokenHash: string, session?: ClientSession) {
    return TransaccionPago.findOne({
      tokenRevisionHash: tokenHash,
      tokenRevisionPurpose: "PAYMENT_PROOF_REVIEW",
      tokenRevisionUsedAt: null,
      tokenRevisionExpiresAt: { $gt: new Date() },
    }).session(session ?? null);
  },

  consumeReviewTokenHash(
    tokenHash: string,
    usedBy: string,
    session?: ClientSession
  ) {
    return TransaccionPago.findOneAndUpdate(
      {
        tokenRevisionHash: tokenHash,
        tokenRevisionPurpose: "PAYMENT_PROOF_REVIEW",
        tokenRevisionUsedAt: null,
        tokenRevisionExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          tokenRevisionUsedAt: new Date(),
          tokenRevisionUsedBy: usedBy,
          tokenRevisionUsado: true,
        },
      },
      { new: true, session }
    );
  },
};
