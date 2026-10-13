import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import CuentaDinero, { type ICuentaDineroDoc } from "@/models/cuentaDinero";
import MovimientoCuenta from "@/models/movimientoCuenta";
import { runInTransaction } from "@/shared/db/runTransaction";
import { AppError } from "@/shared/errors/AppError";
import { assertObjectId } from "@/utils/validacion";
import type {
  CrearCuentaDineroInput,
  CuentaDinero as CuentaDineroType,
} from "@/types/cuentaDinero";
import type {
  OrigenMovimientoCuenta,
  TipoMovimientoCuenta,
} from "@/types/movimientoCuenta";

export async function listCuentasDinero(filtros?: {
  activa?: boolean;
  sucursalId?: string;
}): Promise<CuentaDineroType[]> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filtros?.activa !== undefined) {
    query.activa = filtros.activa;
  }
  if (filtros?.sucursalId) {
    query.$or = [
      { sucursalId: filtros.sucursalId },
      { sucursalId: null },
    ];
  }

  const cuentas = await CuentaDinero.find(query)
    .populate("sucursalId", "nombre codigo tipo")
    .sort({ esPredeterminadaPOS: -1, esPredeterminadaQR: -1, nombre: 1 })
    .lean();

  return cuentas as unknown as CuentaDineroType[];
}

export async function getCuentaDineroById(id: string): Promise<CuentaDineroType> {
  assertObjectId(id, "ID de cuenta inválido");
  await connectDB();
  const cuenta = await CuentaDinero.findById(id)
    .populate("sucursalId", "nombre codigo tipo")
    .lean();
  if (!cuenta) {
    throw new AppError("Cuenta de dinero no encontrada", 404);
  }
  return cuenta as unknown as CuentaDineroType;
}

export async function crearCuentaDinero(
  input: CrearCuentaDineroInput,
  usuarioId: string
): Promise<CuentaDineroType> {
  assertObjectId(usuarioId, "Usuario no autenticado");
  await connectDB();

  return runInTransaction(async (session) => {
    // Si se marca como predeterminada, quitar flag a otras
    if (input.esPredeterminadaPOS && input.sucursalId) {
      await CuentaDinero.updateMany(
        { sucursalId: input.sucursalId },
        { $set: { esPredeterminadaPOS: false } },
        { session }
      );
    }
    if (input.esPredeterminadaQR) {
      await CuentaDinero.updateMany(
        {},
        { $set: { esPredeterminadaQR: false } },
        { session }
      );
    }

    const saldoInicial = Math.max(0, Number(input.saldoInicial || 0));

    const cuenta = new CuentaDinero({
      nombre: input.nombre.trim(),
      tipo: input.tipo,
      moneda: input.moneda || "BOB",
      saldoActual: saldoInicial,
      sucursalId: input.sucursalId ? new mongoose.Types.ObjectId(input.sucursalId) : null,
      numeroCuenta: input.numeroCuenta?.trim() || null,
      bancoNombre: input.bancoNombre?.trim() || null,
      esPredeterminadaPOS: Boolean(input.esPredeterminadaPOS),
      esPredeterminadaQR: Boolean(input.esPredeterminadaQR),
      notas: input.notas?.trim() || null,
      activa: true,
    });

    await cuenta.save({ session });

    if (saldoInicial > 0) {
      const mov = new MovimientoCuenta({
        cuentaId: cuenta._id,
        tipo: "INGRESO",
        monto: saldoInicial,
        saldoAnterior: 0,
        saldoPosterior: saldoInicial,
        concepto: "Saldo inicial de apertura de cuenta",
        origenTipo: "SALDO_INICIAL",
        sucursalId: cuenta.sucursalId,
        usuarioId: new mongoose.Types.ObjectId(usuarioId),
      });
      await mov.save({ session });
    }

    return cuenta.toObject();
  });
}

export type RegistrarMovimientoInput = {
  cuentaId: string | mongoose.Types.ObjectId;
  tipo: TipoMovimientoCuenta;
  monto: number;
  concepto: string;
  origenTipo: OrigenMovimientoCuenta;
  origenId?: string | mongoose.Types.ObjectId | null;
  sucursalId?: string | mongoose.Types.ObjectId | null;
  usuarioId: string | mongoose.Types.ObjectId;
  cuentaContraparteId?: string | mongoose.Types.ObjectId | null;
  comprobanteUrl?: string | null;
};

export async function registrarMovimientoEnCuenta(
  input: RegistrarMovimientoInput,
  session?: ClientSession
) {
  await connectDB();
  const monto = Number(input.monto);
  if (isNaN(monto) || monto <= 0) {
    throw new AppError("El monto del movimiento debe ser positivo", 400);
  }

  const cuenta = await CuentaDinero.findById(input.cuentaId).session(session || null);
  if (!cuenta) {
    throw new AppError("Cuenta de dinero no encontrada", 404);
  }
  if (!cuenta.activa) {
    throw new AppError("La cuenta de dinero se encuentra inactiva", 400);
  }

  const saldoAnterior = Number(cuenta.saldoActual || 0);
  let saldoPosterior: number;

  if (input.tipo === "INGRESO") {
    saldoPosterior = Number((saldoAnterior + monto).toFixed(2));
  } else if (input.tipo === "EGRESO") {
    saldoPosterior = Number((saldoAnterior - monto).toFixed(2));
  } else if (input.tipo === "TRANSFERENCIA") {
    // Las transferencias se modelan como egreso de la emisora e ingreso de la receptora
    saldoPosterior = Number((saldoAnterior - monto).toFixed(2));
  } else {
    throw new AppError("Tipo de movimiento inválido", 400);
  }

  cuenta.saldoActual = saldoPosterior;
  await cuenta.save(session ? { session } : undefined);

  const movimiento = new MovimientoCuenta({
    cuentaId: cuenta._id,
    cuentaContraparteId: input.cuentaContraparteId
      ? new mongoose.Types.ObjectId(input.cuentaContraparteId.toString())
      : null,
    tipo: input.tipo,
    monto,
    saldoAnterior,
    saldoPosterior,
    concepto: input.concepto,
    origenTipo: input.origenTipo,
    origenId: input.origenId ? input.origenId.toString() : null,
    sucursalId: input.sucursalId
      ? new mongoose.Types.ObjectId(input.sucursalId.toString())
      : cuenta.sucursalId || null,
    usuarioId: new mongoose.Types.ObjectId(input.usuarioId.toString()),
    comprobanteUrl: input.comprobanteUrl || null,
  });

  await movimiento.save(session ? { session } : undefined);

  return {
    cuenta,
    movimiento,
  };
}

export async function transferirEntreCuentas(input: {
  cuentaOrigenId: string;
  cuentaDestinoId: string;
  monto: number;
  concepto: string;
  usuarioId: string;
  sucursalId?: string;
}) {
  if (input.cuentaOrigenId === input.cuentaDestinoId) {
    throw new AppError("Las cuentas de origen y destino deben ser distintas", 400);
  }
  const monto = Number(input.monto);
  if (isNaN(monto) || monto <= 0) {
    throw new AppError("El monto a transferir debe ser mayor a 0", 400);
  }

  await connectDB();

  return runInTransaction(async (session) => {
    const origen = await CuentaDinero.findById(input.cuentaOrigenId).session(session);
    const destino = await CuentaDinero.findById(input.cuentaDestinoId).session(session);

    if (!origen || !destino) {
      throw new AppError("Una o ambas cuentas no existen", 404);
    }
    if (!origen.activa || !destino.activa) {
      throw new AppError("No se pueden realizar transferencias con cuentas inactivas", 400);
    }

    // Registrar egreso en origen
    await registrarMovimientoEnCuenta(
      {
        cuentaId: origen._id,
        cuentaContraparteId: destino._id,
        tipo: "EGRESO",
        monto,
        concepto: `Traslado hacia ${destino.nombre}: ${input.concepto}`,
        origenTipo: "TRASLADO_ENTRE_CUENTAS",
        usuarioId: input.usuarioId,
        sucursalId: input.sucursalId || origen.sucursalId,
      },
      session
    );

    // Registrar ingreso en destino
    await registrarMovimientoEnCuenta(
      {
        cuentaId: destino._id,
        cuentaContraparteId: origen._id,
        tipo: "INGRESO",
        monto,
        concepto: `Traslado desde ${origen.nombre}: ${input.concepto}`,
        origenTipo: "TRASLADO_ENTRE_CUENTAS",
        usuarioId: input.usuarioId,
        sucursalId: input.sucursalId || destino.sucursalId,
      },
      session
    );

    return {
      success: true,
      mensaje: `Transferencia de Bs ${monto.toFixed(2)} realizada exitosamente de ${origen.nombre} a ${destino.nombre}`,
    };
  });
}

/**
 * Resuelve automáticamente la cuenta de dinero apropiada para un cobro o pago.
 */
export async function resolveDefaultAccountForPayment(
  metodoPago: "EFECTIVO" | "QR" | "TRANSFERENCIA" | "TARJETA",
  sucursalId?: string | mongoose.Types.ObjectId | null,
  session?: ClientSession
): Promise<ICuentaDineroDoc> {
  await connectDB();

  if (metodoPago === "EFECTIVO") {
    // 1. Buscar caja física predeterminada de la sucursal
    if (sucursalId) {
      const cajaSucursal = await CuentaDinero.findOne(
        { sucursalId, tipo: "CAJA_FISICA", activa: true },
        null,
        session ? { session } : undefined
      );
      if (cajaSucursal) return cajaSucursal;
    }

    // 2. Fallback a cualquier caja física predeterminada POS
    const cajaPos = await CuentaDinero.findOne(
      { esPredeterminadaPOS: true, activa: true },
      null,
      session ? { session } : undefined
    );
    if (cajaPos) return cajaPos;

    // 3. Fallback a cualquier caja física activa
    const anyCaja = await CuentaDinero.findOne(
      { tipo: "CAJA_FISICA", activa: true },
      null,
      session ? { session } : undefined
    );
    if (anyCaja) return anyCaja;
  } else {
    // QR / TRANSFERENCIA / TARJETA
    // 1. Buscar cuenta predeterminada QR
    const cuentaQr = await CuentaDinero.findOne(
      { esPredeterminadaQR: true, activa: true },
      null,
      session ? { session } : undefined
    );
    if (cuentaQr) return cuentaQr;

    // 2. Buscar cuenta tipo BANCO o BILLETERA_QR
    const cuentaBanco = await CuentaDinero.findOne(
      { tipo: { $in: ["BANCO", "BILLETERA_QR"] }, activa: true },
      null,
      session ? { session } : undefined
    );
    if (cuentaBanco) return cuentaBanco;
  }

  // Fallback definitivo: cualquier cuenta activa
  const anyCuenta = await CuentaDinero.findOne(
    { activa: true },
    null,
    session ? { session } : undefined
  );
  if (!anyCuenta) {
    // Crear cuenta automática de contingencia
    const [nueva] = await CuentaDinero.create(
      [
        {
          nombre: "Caja Principal",
          tipo: "CAJA_FISICA",
          moneda: "BOB",
          saldoActual: 0,
          activa: true,
          esPredeterminadaPOS: true,
        },
      ],
      session ? { session } : undefined
    );
    return nueva;
  }

  return anyCuenta;
}

export async function listMovimientosCuenta(
  cuentaId: string,
  limit = 100
) {
  assertObjectId(cuentaId, "ID de cuenta inválido");
  await connectDB();

  return MovimientoCuenta.find({ cuentaId })
    .populate("usuarioId", "nombreCompleto email")
    .populate("cuentaContraparteId", "nombre tipo")
    .populate("sucursalId", "nombre codigo")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function actualizarCuentaDinero(
  id: string,
  input: Partial<CrearCuentaDineroInput> & { activa?: boolean }
): Promise<CuentaDineroType> {
  assertObjectId(id, "ID de cuenta inválido");
  await connectDB();

  const cuenta = await CuentaDinero.findById(id);
  if (!cuenta) {
    throw new AppError("Cuenta de dinero no encontrada", 404);
  }

  if (input.nombre !== undefined) cuenta.nombre = input.nombre;
  if (input.tipo !== undefined) cuenta.tipo = input.tipo;
  if (input.numeroCuenta !== undefined) cuenta.numeroCuenta = input.numeroCuenta;
  if (input.bancoNombre !== undefined) cuenta.bancoNombre = input.bancoNombre;
  if (input.sucursalId !== undefined) {
    cuenta.sucursalId = input.sucursalId ? new mongoose.Types.ObjectId(input.sucursalId) : null;
  }
  if (input.esPredeterminadaPOS !== undefined) cuenta.esPredeterminadaPOS = input.esPredeterminadaPOS;
  if (input.esPredeterminadaQR !== undefined) cuenta.esPredeterminadaQR = input.esPredeterminadaQR;
  if (input.activa !== undefined) cuenta.activa = input.activa;

  await cuenta.save();
  return cuenta.toObject();
}
