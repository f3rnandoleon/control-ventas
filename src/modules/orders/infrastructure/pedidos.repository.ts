import type { ClientSession } from "mongoose";
import Pedido from "@/models/pedido";

export const pedidosRepository = {
  create(payload: Record<string, unknown>, session?: ClientSession) {
    return Pedido.create([payload], session ? { session } : {}).then(
      ([pedido]) => pedido
    );
  },
  listAll(opts?: { page?: number; limit?: number }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    return Pedido.find()
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  },

  listByCustomer(userId: string) {
    return Pedido.find({ cliente: userId })
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email")
      .sort({ createdAt: -1 });
  },

  findById(id: string, session?: ClientSession) {
    return Pedido.findById(id)
      .session(session ?? null)
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email");
  },

  findByIdForCustomer(id: string, customerId: string, session?: ClientSession) {
    return Pedido.findOne({ _id: id, cliente: customerId })
      .session(session ?? null)
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email");
  },

  updateById(id: string, payload: Record<string, unknown>, session?: ClientSession) {
    return Pedido.findByIdAndUpdate(id, { $set: payload }, { new: true, session })
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email");
  },

  findExpiredReserved(limit = 100) {
    return Pedido.find({
      estadoReservaStock: "RESERVED",
      reservaExpiraEn: { $lt: new Date() },
    })
      .sort({ reservaExpiraEn: 1 })
      .limit(limit);
  },
};
