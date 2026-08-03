import type { ClientSession } from "mongoose";
import Pedido from "@/models/pedido";
import User from "@/models/user";
import { buildRecognizedSalesMatch } from "@/modules/orders/domain/recognized-sales";

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

  listRecognizedSales(filters?: SalesRepositoryFilters) {
    if (!filters) return Pedido.find(buildRecognizedSalesMatch())
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email")
      .sort({ createdAt: -1 });
    return listRecognizedSalesPage(filters);
  },

  listRecognizedSalesBySeller(userId: string, filters?: SalesRepositoryFilters) {
    if (!filters) return Pedido.find(buildRecognizedSalesMatch({ vendedor: userId }))
      .populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email")
      .sort({ createdAt: -1 });
    return listRecognizedSalesPage({ ...filters, actorSellerId: userId });
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

  countExpiredReserved() {
    return Pedido.countDocuments({
      estadoReservaStock: "RESERVED",
      reservaExpiraEn: { $lt: new Date() },
    });
  },
};

export type SalesRepositoryFilters = {
  page: number;
  limit: number;
  from?: Date;
  toExclusive?: Date;
  customer?: string;
  seller?: string;
  paymentMethod?: "EFECTIVO" | "QR";
  actorSellerId?: string;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function listRecognizedSalesPage(filters: SalesRepositoryFilters) {
  const extraMatch: Record<string, unknown> = {};
  if (filters.actorSellerId) extraMatch.vendedor = filters.actorSellerId;
  if (filters.paymentMethod) extraMatch.metodoPago = filters.paymentMethod;
  if (filters.from || filters.toExclusive) {
    extraMatch.createdAt = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.toExclusive ? { $lt: filters.toExclusive } : {}),
    };
  }
  if (filters.customer) {
    extraMatch["snapshotCliente.nombreCompleto"] = {
      $regex: escapeRegex(filters.customer), $options: "i",
    };
  }
  if (filters.seller && !filters.actorSellerId) {
    const sellers = await User.find({
      rol: { $in: ["ADMIN", "VENDEDOR"] },
      nombreCompleto: { $regex: escapeRegex(filters.seller), $options: "i" },
    }).select("_id").lean();
    extraMatch.vendedor = { $in: sellers.map((seller) => seller._id) };
  }

  const match = buildRecognizedSalesMatch(extraMatch);
  const [items, total] = await Promise.all([
    Pedido.find(match).populate("cliente", "nombreCompleto email")
      .populate("vendedor", "nombreCompleto email").sort({ createdAt: -1 })
      .skip((filters.page - 1) * filters.limit).limit(filters.limit),
    Pedido.countDocuments(match),
  ]);
  return { items, total };
}
