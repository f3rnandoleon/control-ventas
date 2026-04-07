import type { ClientSession } from "mongoose";
import Cart from "@/models/cart";

export const cartRepository = {
  findByCustomer(customerId: string, session?: ClientSession) {
    return Cart.findOne({ customer: customerId }).session(session ?? null);
  },

  upsertEmptyCart(customerId: string, session?: ClientSession) {
    return Cart.findOneAndUpdate(
      { customer: customerId },
      {
        $setOnInsert: {
          customer: customerId,
          items: [],
          totalItems: 0,
          subtotal: 0,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      }
    );
  },
};
