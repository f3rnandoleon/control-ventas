import type { ClientSession } from "mongoose";
import Entrega from "@/models/entrega";

export const fulfillmentRepository = {
  findById(id: string, session?: ClientSession) {
    return Entrega.findById(id)
      .session(session ?? null)
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email")
      .populate("asignadoA", "nombreCompleto email");
  },

  findByOrderId(pedidoId: string, session?: ClientSession) {
    return Entrega.findOne({ pedidoId })
      .session(session ?? null)
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email")
      .populate("asignadoA", "nombreCompleto email");
  },

  upsertByOrderId(
    pedidoId: string,
    payload: Record<string, unknown>,
    session?: ClientSession
  ) {
    return Entrega.findOneAndUpdate(
      { pedidoId },
      { $set: payload },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      }
    )
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email")
      .populate("asignadoA", "nombreCompleto email");
  },

  updateById(id: string, payload: Record<string, unknown>, session?: ClientSession) {
    return Entrega.findByIdAndUpdate(id, { $set: payload }, { new: true, session })
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email")
      .populate("asignadoA", "nombreCompleto email");
  },
};
