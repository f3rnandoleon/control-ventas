import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import SesionCaja, { type ISesionCajaDoc } from "@/models/sesionCaja";
import {
  resolveDefaultAccountForPayment,
  registrarMovimientoEnCuenta,
} from "./cash-account.service";
import { runInTransaction } from "@/shared/db/runTransaction";
import { AppError } from "@/shared/errors/AppError";
import { assertObjectId } from "@/utils/validacion";
import type {
  AbrirSesionCajaInput,
  CerrarSesionCajaInput,
  RegistrarMovimientoManualCajaInput,
  SesionCaja as SesionCajaType,
} from "@/types/sesionCaja";

export async function obtenerSesionCajaActiva(
  sucursalId: string,
  session?: ClientSession
): Promise<ISesionCajaDoc | null> {
  assertObjectId(sucursalId, "ID de sucursal inválido");
  await connectDB();

  return SesionCaja.findOne(
    { sucursalId, estado: "ABIERTA" },
    null,
    session ? { session } : undefined
  ).populate("usuarioAperturaId", "nombreCompleto email");
}

export async function abrirSesionCaja(
  input: AbrirSesionCajaInput,
  usuarioId: string
): Promise<SesionCajaType> {
  assertObjectId(input.sucursalId, "ID de sucursal inválido");
  assertObjectId(usuarioId, "Usuario no autenticado");
  await connectDB();

  return runInTransaction(async (session) => {
    // 1. Validar que no haya una sesión ya abierta en la misma sucursal
    const activaExistente = await SesionCaja.findOne(
      { sucursalId: input.sucursalId, estado: "ABIERTA" },
      null,
      { session }
    );
    if (activaExistente) {
      throw new AppError(
        "Ya existe una sesión de caja abierta en esta tienda. Debe cerrarla antes de iniciar una nueva.",
        400
      );
    }

    // 2. Obtener la cuenta de caja física de la sucursal
    const cuentaCaja = await resolveDefaultAccountForPayment(
      "EFECTIVO",
      input.sucursalId,
      session
    );

    const montoApertura = Math.max(0, Number(input.montoApertura || 0));

    // 3. Crear sesión
    const sesionCaja = new SesionCaja({
      sucursalId: new mongoose.Types.ObjectId(input.sucursalId),
      cuentaDineroId: cuentaCaja._id,
      usuarioAperturaId: new mongoose.Types.ObjectId(usuarioId),
      fechaApertura: new Date(),
      montoApertura,
      montoEsperadoEfectivo: montoApertura,
      totalVentasEfectivo: 0,
      totalVentasQR: 0,
      totalVentasTarjeta: 0,
      totalIngresosManuales: 0,
      totalEgresosManuales: 0,
      movimientosManuales: [],
      estado: "ABIERTA",
      notasApertura: input.notasApertura?.trim() || null,
    });

    await sesionCaja.save({ session });

    // Si el fondo de cambio es mayor a 0, registrar apertura
    if (montoApertura > 0) {
      await registrarMovimientoEnCuenta(
        {
          cuentaId: cuentaCaja._id,
          tipo: "INGRESO",
          monto: montoApertura,
          concepto: `Fondo inicial de apertura de caja (Turno #${sesionCaja._id.toString().slice(-6)})`,
          origenTipo: "SALDO_INICIAL",
          origenId: sesionCaja._id,
          sucursalId: input.sucursalId,
          usuarioId,
        },
        session
      );
    }

    return sesionCaja.toObject();
  });
}

export async function acumularVentaEnSesion(
  params: {
    sucursalId: string | mongoose.Types.ObjectId;
    total: number;
    metodoPago: string;
  },
  session?: ClientSession
) {
  await connectDB();
  const sesion = await SesionCaja.findOne(
    { sucursalId: params.sucursalId, estado: "ABIERTA" },
    null,
    session ? { session } : undefined
  );

  if (!sesion) {
    // Si no hay sesión y es obligatorio para POS, crearVentaDirecta ya habrá arrojado error
    return null;
  }

  const monto = Number(params.total || 0);

  if (params.metodoPago === "EFECTIVO") {
    sesion.totalVentasEfectivo += monto;
    sesion.montoEsperadoEfectivo += monto;
  } else if (params.metodoPago === "QR") {
    sesion.totalVentasQR += monto;
  } else if (params.metodoPago === "TARJETA") {
    sesion.totalVentasTarjeta += monto;
  }

  await sesion.save(session ? { session } : undefined);
  return sesion;
}

export async function registrarMovimientoManual(
  input: RegistrarMovimientoManualCajaInput,
  usuarioId: string
) {
  assertObjectId(input.sesionId, "ID de sesión inválido");
  assertObjectId(usuarioId, "Usuario no autenticado");
  const monto = Number(input.monto);
  if (isNaN(monto) || monto <= 0) {
    throw new AppError("El monto debe ser mayor a 0", 400);
  }

  await connectDB();

  return runInTransaction(async (session) => {
    const sesionCaja = await SesionCaja.findById(input.sesionId).session(session);
    if (!sesionCaja) {
      throw new AppError("Sesión de caja no encontrada", 404);
    }
    if (sesionCaja.estado !== "ABIERTA") {
      throw new AppError("No se pueden registrar movimientos en una caja cerrada", 400);
    }

    const hora = new Date().toLocaleTimeString("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    sesionCaja.movimientosManuales.push({
      tipo: input.tipo,
      monto,
      motivo: input.motivo.trim(),
      hora,
    });

    if (input.tipo === "INGRESO") {
      sesionCaja.totalIngresosManuales += monto;
      sesionCaja.montoEsperadoEfectivo += monto;
    } else {
      sesionCaja.totalEgresosManuales += monto;
      sesionCaja.montoEsperadoEfectivo -= monto;
    }

    await sesionCaja.save({ session });

    // Afectar cuenta de dinero
    await registrarMovimientoEnCuenta(
      {
        cuentaId: sesionCaja.cuentaDineroId,
        tipo: input.tipo === "INGRESO" ? "INGRESO" : "EGRESO",
        monto,
        concepto: `Movimiento manual de caja (${input.tipo}): ${input.motivo}`,
        origenTipo: "AJUSTE_ARQUEO",
        origenId: sesionCaja._id,
        sucursalId: sesionCaja.sucursalId,
        usuarioId,
      },
      session
    );

    return sesionCaja.toObject();
  });
}

export async function cerrarSesionCaja(
  input: CerrarSesionCajaInput,
  usuarioId: string
): Promise<SesionCajaType> {
  assertObjectId(input.sesionId, "ID de sesión inválido");
  assertObjectId(usuarioId, "Usuario no autenticado");
  await connectDB();

  return runInTransaction(async (session) => {
    const sesionCaja = await SesionCaja.findById(input.sesionId).session(session);
    if (!sesionCaja) {
      throw new AppError("Sesión de caja no encontrada", 404);
    }
    if (sesionCaja.estado !== "ABIERTA") {
      throw new AppError("Esta sesión de caja ya fue cerrada", 400);
    }

    const montoDeclarado = Math.max(0, Number(input.montoDeclaradoEfectivo));
    const montoEsperado = Number(sesionCaja.montoEsperadoEfectivo.toFixed(2));
    const diferencia = Number((montoDeclarado - montoEsperado).toFixed(2));

    sesionCaja.montoDeclaradoEfectivo = montoDeclarado;
    sesionCaja.diferenciaEfectivo = diferencia;
    sesionCaja.usuarioCierreId = new mongoose.Types.ObjectId(usuarioId);
    sesionCaja.fechaCierre = new Date();
    sesionCaja.estado = "CERRADA";
    sesionCaja.notasCierre = input.notasCierre?.trim() || null;

    await sesionCaja.save({ session });

    // Si hubo diferencia (faltante o sobrante), registrar asiento de arqueo en la cuenta
    if (diferencia !== 0) {
      const esSobrante = diferencia > 0;
      await registrarMovimientoEnCuenta(
        {
          cuentaId: sesionCaja.cuentaDineroId,
          tipo: esSobrante ? "INGRESO" : "EGRESO",
          monto: Math.abs(diferencia),
          concepto: `Ajuste de Arqueo al Cierre (${esSobrante ? "Sobrante" : "Faltante"} de caja): ${sesionCaja.notasCierre || "Sin notas"}`,
          origenTipo: "AJUSTE_ARQUEO",
          origenId: sesionCaja._id,
          sucursalId: sesionCaja.sucursalId,
          usuarioId,
        },
        session
      );
    }

    return sesionCaja.toObject();
  });
}

export async function listarSesionesCaja(filtros?: {
  sucursalId?: string;
  estado?: string;
  limit?: number;
}) {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filtros?.sucursalId) query.sucursalId = filtros.sucursalId;
  if (filtros?.estado) query.estado = filtros.estado;

  return SesionCaja.find(query)
    .populate("sucursalId", "nombre codigo")
    .populate("usuarioAperturaId", "nombreCompleto email")
    .populate("usuarioCierreId", "nombreCompleto email")
    .sort({ createdAt: -1 })
    .limit(filtros?.limit || 50)
    .lean();
}
