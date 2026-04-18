import type { ClientSession } from "mongoose";
import Inventario from "@/models/inventario";

export const inventoryRepository = {
  listAll() {
    return Inventario.find()
      .populate("productoId", "nombre modelo")
      .populate("usuario", "fullname email")
      .sort({ createdAt: -1 });
  },

  listByProduct(productoId: string) {
    return Inventario.find({ productoId })
      .populate("usuario", "fullname")
      .sort({ createdAt: -1 });
  },

  create(payload: Record<string, unknown>, session?: ClientSession) {
    return Inventario.create([payload], session ? { session } : {}).then(
      ([movimiento]) => movimiento
    );
  },
};
