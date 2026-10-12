import type { ClientSession } from "mongoose";
import Compra from "@/models/compra";

export const comprasRepository = {
  create(payload: Record<string, unknown>, session?: ClientSession) {
    return Compra.create([payload], session ? { session } : {}).then(
      ([compra]) => compra
    );
  },

  listAll(opts?: { page?: number; limit?: number }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 100;
    return Compra.find()
      .populate("creadoPor", "nombreCompleto email")
      .sort({ fecha: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  },

  findById(id: string, session?: ClientSession) {
    return Compra.findById(id)
      .session(session ?? null)
      .populate("creadoPor", "nombreCompleto email");
  },

  async generateNextNumeroCompra(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `COM-${year}-`;
    const lastCompra = (await Compra.findOne({
      numeroCompra: { $regex: `^${prefix}` },
    })
      .sort({ numeroCompra: -1 })
      .select("numeroCompra")
      .lean()) as { numeroCompra?: string } | null;

    if (!lastCompra || !lastCompra.numeroCompra) {
      return `${prefix}0001`;
    }

    const currentSeq = parseInt(lastCompra.numeroCompra.replace(prefix, ""), 10);
    const nextSeq = isNaN(currentSeq) ? 1 : currentSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(4, "0")}`;
  },
};
