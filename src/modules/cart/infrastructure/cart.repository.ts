import type { ClientSession } from "mongoose";
import Carrito from "@/models/carrito";

export const cartRepository = {
  findByCustomer(clienteId: string, session?: ClientSession) {
    return Carrito.findOne({ cliente: clienteId }).session(session ?? null);
  },

  upsertEmptyCart(clienteId: string, session?: ClientSession) {
    return Carrito.findOneAndUpdate(
      { cliente: clienteId },
      {
        $setOnInsert: {
          cliente: clienteId,
          items: [],
          totalArticulos: 0,
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
