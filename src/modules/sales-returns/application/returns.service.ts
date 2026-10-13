import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import Producto from "@/models/producto";
import NivelStock from "@/models/nivelStock";
import Inventario from "@/models/inventario";
import DevolucionCambio from "@/models/devolucionCambio";
import {
  registrarMovimientoEnCuenta,
  resolveDefaultAccountForPayment,
} from "@/modules/finance/application/cash-account.service";
import { runInTransaction } from "@/shared/db/runTransaction";
import { AppError } from "@/shared/errors/AppError";
import { assertObjectId } from "@/utils/validacion";
import { generateOrderedId } from "@/utils/generarId";
import type {
  RegistrarDevolucionCambioInput,
  DevolucionCambio as DevolucionCambioType,
  ItemDevueltoRecord,
  ItemEntregadoRecord,
} from "@/types/devolucionCambio";

function generarNumeroDevolucion() {
  return generateOrderedId("DEV");
}

export async function procesarDevolucionCambio(
  input: RegistrarDevolucionCambioInput,
  usuarioId: string
): Promise<DevolucionCambioType> {
  assertObjectId(usuarioId, "Usuario no autenticado");
  assertObjectId(input.pedidoId, "ID de pedido inválido");

  if (!input.itemsDevueltos || input.itemsDevueltos.length === 0) {
    throw new AppError("Debe incluir al menos un ítem devuelto", 400);
  }

  await connectDB();

  return runInTransaction(async (session) => {
    const pedido = await Pedido.findById(input.pedidoId).session(session);
    if (!pedido) {
      throw new AppError("Pedido no encontrado", 404);
    }

    const sucursalId = pedido.sucursalId;
    if (!sucursalId) {
      throw new AppError("El pedido no tiene sucursal asociada", 400);
    }

    const numeroOperacion = generarNumeroDevolucion();

    // 1. Procesar ítems devueltos
    let montoDevolucion = 0;
    const itemsDevueltosProcesados: ItemDevueltoRecord[] = [];

    for (const item of input.itemsDevueltos) {
      assertObjectId(item.productoId, "ID de producto devuelto inválido");
      const cant = Number(item.cantidad);
      if (cant <= 0) throw new AppError("Cantidad inválida para devolución", 400);

      const precioUnit = Number(item.precioUnitario);
      const subtotalItem = Number((cant * precioUnit).toFixed(2));
      montoDevolucion += subtotalItem;

      // Buscar datos de producto para stock y kárdex
      const producto = await Producto.findById(item.productoId).session(session);
      if (!producto) throw new AppError(`Producto devuelto no encontrado`, 404);

      const variante = (producto.variantes || []).find(
        (v: { varianteId?: string }) => v.varianteId === item.varianteId
      );

      const precioCosto = Number(
        item.precioCosto || variante?.precioCosto || producto.precioCosto || 0
      );

      if (item.destinoFisico === "REINGRESO_STOCK") {
        // Reingreso físico al stock vendible de la sucursal
        await NivelStock.findOneAndUpdate(
          { sucursalId, varianteId: item.varianteId },
          { $inc: { stockFisico: cant } },
          { upsert: true, session }
        );

        // Reingreso al catálogo global
        if (variante) {
          variante.stock = (variante.stock || 0) + cant;
          producto.totalVendidos = Math.max(0, (producto.totalVendidos || 0) - cant);
          await producto.save({ session });
        }

        // Asiento en Kárdex como DEVOLUCIÓN
        await Inventario.create(
          [
            {
              productoId: producto._id,
              variante: {
                color: item.color || variante?.color || "",
                talla: item.talla || variante?.talla || "",
              },
              tipo: "DEVOLUCION",
              cantidad: cant,
              costoUnitario: precioCosto,
              motivo: `Devolución ${numeroOperacion}: ${item.motivo}`,
              referencia: `PEDIDO_${pedido.numeroPedido}`,
              sucursalId,
              usuario: usuarioId,
            },
          ],
          { session }
        );
      } else {
        // MERMA / DAÑADO: No vuelve al stock vendible, se asienta baja por merma
        await Inventario.create(
          [
            {
              productoId: producto._id,
              variante: {
                color: item.color || variante?.color || "",
                talla: item.talla || variante?.talla || "",
              },
              tipo: "SALIDA",
              cantidad: cant,
              costoUnitario: precioCosto,
              motivo: `MERMA_DEVOLUCION_DANADO (${item.motivo})`,
              referencia: `DEV_MERMA_${numeroOperacion}`,
              sucursalId,
              usuario: usuarioId,
            },
          ],
          { session }
        );
      }

      itemsDevueltosProcesados.push({
        productoId: item.productoId,
        varianteId: item.varianteId,
        nombre: item.nombre || producto.nombre,
        color: item.color || variante?.color || "",
        talla: item.talla || variante?.talla || "",
        cantidad: cant,
        precioUnitario: precioUnit,
        precioCosto,
        subtotal: subtotalItem,
        destinoFisico: item.destinoFisico,
        motivo: item.motivo,
      });
    }

    // 2. Procesar ítems nuevos entregados si es un cambio
    let montoEntregado = 0;
    const itemsEntregadosProcesados: ItemEntregadoRecord[] = [];

    if (input.tipo === "CAMBIO" && input.itemsEntregados && input.itemsEntregados.length > 0) {
      for (const item of input.itemsEntregados) {
        assertObjectId(item.productoId, "ID de producto a entregar inválido");
        const cant = Number(item.cantidad);
        if (cant <= 0) throw new AppError("Cantidad inválida para entrega en cambio", 400);

        const producto = await Producto.findById(item.productoId).session(session);
        if (!producto) throw new AppError(`Producto a entregar no encontrado`, 404);

        const variante = (producto.variantes || []).find(
          (v: { varianteId?: string }) => v.varianteId === item.varianteId
        );
        if (!variante) {
          throw new AppError(`Variante ${item.varianteId} no encontrada`, 404);
        }

        // Verificar stock disponible en la sucursal
        const nivelStock = await NivelStock.findOne(
          { sucursalId, varianteId: item.varianteId },
          null,
          { session }
        );
        const stockDisponible = Math.max(
          0,
          Number(nivelStock?.stockFisico || 0) - Number(nivelStock?.stockReservado || 0)
        );

        if (stockDisponible < cant) {
          throw new AppError(
            `Stock insuficiente en tienda para ${producto.nombre} (${variante.color}/${variante.talla}). Disponible: ${stockDisponible}`,
            400
          );
        }

        // Descontar stock físico en la sucursal
        await NivelStock.findOneAndUpdate(
          { sucursalId, varianteId: item.varianteId },
          { $inc: { stockFisico: -cant } },
          { session }
        );

        // Descontar en catálogo global
        variante.stock = Math.max(0, (variante.stock || 0) - cant);
        producto.totalVendidos = (producto.totalVendidos || 0) + cant;
        await producto.save({ session });

        const precioUnit = Number(item.precioUnitario || variante.precioVenta || producto.precioVenta || 0);
        const precioCosto = Number(variante.precioCosto || producto.precioCosto || 0);
        const subtotalItem = Number((cant * precioUnit).toFixed(2));
        montoEntregado += subtotalItem;

        // Asiento en Kárdex como SALIDA POR CAMBIO
        await Inventario.create(
          [
            {
              productoId: producto._id,
              variante: {
                color: variante.color || "",
                talla: variante.talla || "",
              },
              tipo: "SALIDA",
              cantidad: cant,
              costoUnitario: precioCosto,
              motivo: `Entrega por Cambio ${numeroOperacion}`,
              referencia: `PEDIDO_${pedido.numeroPedido}`,
              sucursalId,
              usuario: usuarioId,
            },
          ],
          { session }
        );

        itemsEntregadosProcesados.push({
          productoId: item.productoId,
          varianteId: item.varianteId,
          nombre: item.nombre || producto.nombre,
          color: variante.color || "",
          talla: variante.talla || "",
          cantidad: cant,
          precioUnitario: precioUnit,
          precioCosto,
          subtotal: subtotalItem,
        });
      }
    }

    montoDevolucion = Number(montoDevolucion.toFixed(2));
    montoEntregado = Number(montoEntregado.toFixed(2));
    const diferenciaMonto = Number((montoEntregado - montoDevolucion).toFixed(2));

    let accionMonetaria: "REEMBOLSO_CLIENTE" | "COBRO_ADICIONAL" | "NINGUNO" = "NINGUNO";
    let targetCuentaId: mongoose.Types.ObjectId | null = null;

    if (input.cuentaDineroId && mongoose.Types.ObjectId.isValid(input.cuentaDineroId)) {
      targetCuentaId = new mongoose.Types.ObjectId(input.cuentaDineroId);
    } else {
      // Resolver cuenta por defecto de la sucursal (ej: Caja Chica Tienda 1)
      const metodo = input.metodoPagoDiferencia || "EFECTIVO";
      const cuentaDefault = await resolveDefaultAccountForPayment(metodo, sucursalId, session);
      if (cuentaDefault) {
        targetCuentaId = cuentaDefault._id as mongoose.Types.ObjectId;
      }
    }

    if (diferenciaMonto < 0) {
      // Reembolso al cliente
      accionMonetaria = "REEMBOLSO_CLIENTE";
      const montoReembolso = Math.abs(diferenciaMonto);

      if (targetCuentaId) {
        await registrarMovimientoEnCuenta(
          {
            cuentaId: targetCuentaId,
            tipo: "EGRESO",
            monto: montoReembolso,
            concepto: `Reembolso por ${input.tipo} ${numeroOperacion} (Pedido ${pedido.numeroPedido})`,
            origenTipo: "REEMBOLSO_DEVOLUCION",
            origenId: new mongoose.Types.ObjectId(),
            sucursalId,
            usuarioId,
          },
          session
        );
      }
    } else if (diferenciaMonto > 0) {
      // Cobro adicional por diferencia de precio a favor de la tienda
      accionMonetaria = "COBRO_ADICIONAL";

      if (targetCuentaId) {
        await registrarMovimientoEnCuenta(
          {
            cuentaId: targetCuentaId,
            tipo: "INGRESO",
            monto: diferenciaMonto,
            concepto: `Cobro adicional por Cambio ${numeroOperacion} (Pedido ${pedido.numeroPedido})`,
            origenTipo: "COBRO_DEVOLUCION",
            origenId: new mongoose.Types.ObjectId(),
            sucursalId,
            usuarioId,
          },
          session
        );
      }
    }

    // 3. Crear registro DevolucionCambio
    const docDevolucion = new DevolucionCambio({
      numeroOperacion,
      pedidoId: pedido._id,
      numeroPedido: pedido.numeroPedido,
      sucursalId,
      tipo: input.tipo,
      itemsDevueltos: itemsDevueltosProcesados,
      itemsEntregados: itemsEntregadosProcesados,
      montoDevolucion,
      montoEntregado,
      diferenciaMonto,
      accionMonetaria,
      cuentaDineroId: targetCuentaId,
      usuarioId: new mongoose.Types.ObjectId(usuarioId),
      observaciones: input.observaciones || "",
    });

    await docDevolucion.save({ session });

    return docDevolucion.toObject();
  });
}

export async function listarDevolucionesCambios(filtros?: {
  pedidoId?: string;
  sucursalId?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}) {
  await connectDB();
  const query: Record<string, unknown> = {};

  if (filtros?.pedidoId) {
    query.pedidoId = filtros.pedidoId;
  }
  if (filtros?.sucursalId) {
    query.sucursalId = filtros.sucursalId;
  }
  if (filtros?.tipo) {
    query.tipo = filtros.tipo;
  }

  if (filtros?.desde || filtros?.hasta) {
    query.createdAt = {};
    if (filtros.desde) {
      (query.createdAt as Record<string, unknown>).$gte = new Date(filtros.desde);
    }
    if (filtros.hasta) {
      const hastaDate = new Date(filtros.hasta);
      hastaDate.setHours(23, 59, 59, 999);
      (query.createdAt as Record<string, unknown>).$lte = hastaDate;
    }
  }

  const docs = await DevolucionCambio.find(query)
    .populate("sucursalId", "nombre codigo")
    .populate("cuentaDineroId", "nombre tipo")
    .populate("usuarioId", "nombreCompleto email")
    .sort({ createdAt: -1 })
    .limit(filtros?.limit || 100)
    .lean();

  return docs as unknown as DevolucionCambioType[];
}
