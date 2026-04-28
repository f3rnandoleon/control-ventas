import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import { findCatalogProductByCode } from "@/modules/catalog/application/catalog.service";
import { crearVentaDirecta } from "@/modules/orders/application/pedidos.service";
import type { CreatePosSaleInput } from "@/schemas/pos.schema";
import { AppError } from "@/shared/errors/AppError";

type SalesActor = {
  id: string;
  rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
};

function assertStaff(actor: SalesActor) {
  if (!["ADMIN", "VENDEDOR"].includes(actor.rol)) {
    throw new AppError("No autorizado", 403);
  }
}

export async function scanVariantForPos(code: string) {
  const producto = await findCatalogProductByCode(code);

  return {
    ...producto,
    scanSource:
      producto.variante.codigoBarra === code
        ? "BARCODE"
        : producto.variante.qrCode === code
          ? "QR"
          : "UNKNOWN",
  };
}

export async function createPosSale(
  actor: SalesActor,
  input: CreatePosSaleInput
) {
  assertStaff(actor);

  return crearVentaDirecta(actor as unknown as { id: string; rol: "ADMIN" | "VENDEDOR" }, {
    ...input,
    canal: "APP_QR",
  } as unknown as Parameters<typeof crearVentaDirecta>[1]);
}

export async function listMyPosSales(actor: SalesActor) {
  assertStaff(actor);
  await connectDB();

  return Pedido.find({
    vendedor: actor.id,
    canal: "APP_QR",
  })
    .populate("vendedor", "nombreCompleto email")
    .sort({ createdAt: -1 });
}

export async function getMyPosSummary(actor: SalesActor) {
  assertStaff(actor);
  await connectDB();

  const sellerId = new mongoose.Types.ObjectId(actor.id);
  const [summary] = await Pedido.aggregate([
    {
      $match: {
        vendedor: sellerId,
        canal: "APP_QR",
      },
    },
    {
      $group: {
        _id: null,
        totalVentas: { $sum: 1 },
        totalIngresos: { $sum: "$total" },
        totalGanancia: { $sum: "$gananciaTotal" },
        totalDescuentos: { $sum: "$descuento" },
        efectivoVentas: {
          $sum: {
            $cond: [{ $eq: ["$metodoPago", "EFECTIVO"] }, 1, 0],
          },
        },
        qrVentas: {
          $sum: {
            $cond: [{ $eq: ["$metodoPago", "QR"] }, 1, 0],
          },
        },
      },
    },
  ]);

  return (
    summary || {
      totalVentas: 0,
      totalIngresos: 0,
      totalGanancia: 0,
      totalDescuentos: 0,
      efectivoVentas: 0,
      qrVentas: 0,
    }
  );
}
