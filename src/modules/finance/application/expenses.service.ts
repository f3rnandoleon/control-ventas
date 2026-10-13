import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Gasto from "@/models/gasto";
import { registrarMovimientoEnCuenta } from "./cash-account.service";
import { runInTransaction } from "@/shared/db/runTransaction";
import { AppError } from "@/shared/errors/AppError";
import { assertObjectId } from "@/utils/validacion";
import { generateOrderedId } from "@/utils/generarId";
import type { RegistrarGastoInput, Gasto as GastoType } from "@/types/gasto";

function generarNumeroGasto() {
  return generateOrderedId("GST");
}

export async function registrarGasto(
  input: RegistrarGastoInput,
  usuarioId: string
): Promise<GastoType> {
  assertObjectId(usuarioId, "Usuario no autenticado");
  assertObjectId(input.cuentaDineroId, "ID de cuenta de dinero inválido");

  const monto = Number(input.monto);
  if (isNaN(monto) || monto <= 0) {
    throw new AppError("El monto del gasto debe ser mayor a 0", 400);
  }

  await connectDB();

  return runInTransaction(async (session) => {
    const numeroGasto = generarNumeroGasto();

    const gasto = new Gasto({
      numeroGasto,
      fecha: input.fecha ? new Date(input.fecha) : new Date(),
      categoria: input.categoria,
      naturaleza: input.naturaleza,
      monto,
      descripcion: input.descripcion.trim(),
      beneficiarioProveedor: input.beneficiarioProveedor?.trim() || null,
      comprobanteUrl: input.comprobanteUrl?.trim() || null,
      cuentaDineroId: new mongoose.Types.ObjectId(input.cuentaDineroId),
      sucursalId: input.sucursalId ? new mongoose.Types.ObjectId(input.sucursalId) : null,
      creadoPor: new mongoose.Types.ObjectId(usuarioId),
    });

    await gasto.save({ session });

    // Registrar egreso automático en la cuenta de dinero
    await registrarMovimientoEnCuenta(
      {
        cuentaId: gasto.cuentaDineroId,
        tipo: "EGRESO",
        monto,
        concepto: `Gasto ${numeroGasto} (${gasto.categoria}): ${gasto.descripcion}`,
        origenTipo: "GASTO",
        origenId: gasto._id,
        sucursalId: gasto.sucursalId,
        usuarioId,
        comprobanteUrl: gasto.comprobanteUrl,
      },
      session
    );

    return gasto.toObject();
  });
}

export async function listarGastos(filtros?: {
  desde?: string;
  hasta?: string;
  categoria?: string;
  naturaleza?: string;
  sucursalId?: string;
  limit?: number;
}) {
  await connectDB();
  const query: Record<string, unknown> = {};

  if (filtros?.categoria) {
    query.categoria = filtros.categoria;
  }
  if (filtros?.naturaleza) {
    query.naturaleza = filtros.naturaleza;
  }
  if (filtros?.sucursalId) {
    query.sucursalId = filtros.sucursalId;
  }

  if (filtros?.desde || filtros?.hasta) {
    query.fecha = {};
    if (filtros.desde) {
      (query.fecha as Record<string, unknown>).$gte = new Date(filtros.desde);
    }
    if (filtros.hasta) {
      const hastaDate = new Date(filtros.hasta);
      hastaDate.setHours(23, 59, 59, 999);
      (query.fecha as Record<string, unknown>).$lte = hastaDate;
    }
  }

  const gastos = await Gasto.find(query)
    .populate("cuentaDineroId", "nombre tipo")
    .populate("sucursalId", "nombre codigo")
    .populate("creadoPor", "nombreCompleto email")
    .sort({ fecha: -1, createdAt: -1 })
    .limit(filtros?.limit || 100)
    .lean();

  return gastos as unknown as GastoType[];
}

export async function eliminarGasto(id: string, usuarioId: string) {
  assertObjectId(id, "ID de gasto inválido");
  assertObjectId(usuarioId, "Usuario no autenticado");
  await connectDB();

  return runInTransaction(async (session) => {
    const gasto = await Gasto.findById(id).session(session);
    if (!gasto) {
      throw new AppError("Gasto no encontrado", 404);
    }

    // Revertir el egreso con un ingreso de anulación
    await registrarMovimientoEnCuenta(
      {
        cuentaId: gasto.cuentaDineroId,
        tipo: "INGRESO",
        monto: gasto.monto,
        concepto: `Anulación de Gasto ${gasto.numeroGasto}`,
        origenTipo: "GASTO",
        origenId: gasto._id,
        sucursalId: gasto.sucursalId,
        usuarioId,
      },
      session
    );

    await Gasto.findByIdAndDelete(id).session(session);

    return { success: true, message: `Gasto ${gasto.numeroGasto} eliminado y fondo revertido` };
  });
}
