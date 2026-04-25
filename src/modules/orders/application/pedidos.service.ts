import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/producto";

import { getValidatedCartForCheckout, clearCartByUserId } from "@/modules/cart/application/cart.service";
import {
  obtenerDireccionClientePorUsuario,
  obtenerContextoClientePorUsuario,
} from "@/modules/clientes/application/clientes.service";
import {
  getAvailableStockForVariant,
  releaseReservedStockForOrder,
  reserveStockForOrder,
  consumeReservedStockForOrder
} from "@/modules/inventory/application/inventory.service";
import { pedidosRepository } from "@/modules/orders/infrastructure/pedidos.repository";
import { syncFulfillmentForOrder } from "@/modules/fulfillment/application/fulfillment.service";
import {
  recordAuditEventSafe,
  type AuditActorRole,
} from "@/modules/audit/application/audit.service";
import { AppError } from "@/shared/errors/AppError";
import { runInTransaction } from "@/shared/db/runTransaction";
import type { CheckoutCartInput } from "@/schemas/cart.schema";
import type { UpdateEstadoPedidoInput, UpdatePedidoEntregaInput, CreatePedidoInput } from "@/schemas/pedido.schema";
import { generateOrderedId } from "@/utils/generarId";
import { assertObjectId } from "@/utils/validacion";
import { findVariantByIdentity } from "@/utils/varianteIdentity";
import type { Variante } from "@/types/producto";

function createPedidoNumber() {
  return generateOrderedId("P");
}

function createReservationExpirationDate(minutes = 15) {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + minutes);
  return expiration;
}

async function releasePedidoReservation(pedido: {
  _id?: string | mongoose.Types.ObjectId;
  items: Array<{
    productoId: string | mongoose.Types.ObjectId;
    variante: {
      varianteId?: string;
      color: string;
      colorSecundario?: string;
      talla: string;
    };
    cantidad: number;
  }>;
}, session?: mongoose.ClientSession) {
  for (const item of pedido.items) {
    const producto = await Producto.findById(item.productoId).session(session ?? null);
    if (!producto) continue;

    const variante = producto.variantes.find((candidate: {
      varianteId?: string;
      color: string;
      colorSecundario?: string;
      talla: string;
    }) => {
      if (item.variante.varianteId && candidate.varianteId) {
        return candidate.varianteId === item.variante.varianteId;
      }
      return (
        candidate.color === item.variante.color &&
        (item.variante.colorSecundario === undefined ||
          (candidate.colorSecundario || "") ===
          (item.variante.colorSecundario || "")) &&
        candidate.talla === item.variante.talla
      );
    });

    if (!variante) continue;

    await releaseReservedStockForOrder({
      producto,
      variante,
      cantidad: item.cantidad,
    }, session);
  }
}

export async function releaseExpiredReservations(limit = 100) {
  await connectDB();
  const expiredPedidos = await pedidosRepository.findExpiredReserved(limit);
  let releasedCount = 0;
  const details: string[] = [];

  for (const expiredPedido of expiredPedidos) {
    const wasReleased = await runInTransaction(async (session) => {
      const pedido = await pedidosRepository.findById(
        expiredPedido._id.toString(),
        session
      );

      if (
        !pedido ||
        pedido.estadoReservaStock !== "RESERVED" ||
        !pedido.reservaExpiraEn ||
        pedido.reservaExpiraEn >= new Date()
      ) {
        return false;
      }

      await releasePedidoReservation(pedido, session);

      pedido.estadoReservaStock = "RELEASED";
      pedido.estadoPedido = "CANCELLED";
      pedido.estadoPago = "FAILED";
      pedido.estadoEntrega = "CANCELLED";
      pedido.reservadoEn = null;
      pedido.reservaExpiraEn = null;
      await pedido.save({ session });

      return true;
    });

    if (wasReleased) {
      releasedCount += 1;
      details.push(expiredPedido._id.toString());
    }
  }

  return { releasedCount, details };
}

export async function crearPedidoDesdeCarrito(
  customerId: string,
  payload: CheckoutCartInput
) {
  assertObjectId(customerId, "Usuario no valido");
  await connectDB();

  const customer = await obtenerContextoClientePorUsuario(customerId, {
    ensureProfile: true,
  });

  const metodoEntrega = payload.entrega?.metodo ?? null;
  let snapshotEntrega: Record<string, unknown> | null = null;

  if (metodoEntrega === "WHATSAPP") {
    snapshotEntrega = { metodo: "WHATSAPP" };
  } else if (metodoEntrega === "PICKUP_POINT") {
    snapshotEntrega = {
      metodo: "PICKUP_POINT",
      puntoRecojo: payload.entrega?.direccion ?? null,
      telefono: payload.entrega?.telefono ?? null,
      nombreDestinatario: payload.entrega?.nombreDestinatario || customer.user.nombreCompleto,
      programadoPara: payload.entrega?.programadoPara ?? null,
    };
  } else if (metodoEntrega === "SHIPPING_NATIONAL") {
    snapshotEntrega = {
      metodo: "SHIPPING_NATIONAL",
      departamento: payload.entrega?.departamento ?? null,
      ciudad: payload.entrega?.ciudad ?? null,
      empresaEnvio: payload.entrega?.empresaEnvio ?? null,
      sucursal: payload.entrega?.sucursal ?? null,
      nombreRemitente: payload.entrega?.nombreRemitente ?? null,
      ciRemitente: payload.entrega?.ciRemitente ?? null,
      telefonoRemitente: payload.entrega?.telefonoRemitente ?? null,
      nombreDestinatario: payload.entrega?.nombreDestinatario || customer.user.nombreCompleto,
    };
  } else if (payload.direccionId) {
    const address = await obtenerDireccionClientePorUsuario(customerId, payload.direccionId);
    snapshotEntrega = {
      metodo: "PICKUP_POINT",
      puntoRecojo: payload.entrega?.direccion || address.direccion,
      telefono: payload.entrega?.telefono || address.telefono,
      nombreDestinatario: payload.entrega?.nombreDestinatario || address.nombreDestinatario,
    };
  } else if (customer.defaultAddress) {
    snapshotEntrega = {
      metodo: "PICKUP_POINT",
      puntoRecojo: customer.defaultAddress.direccion,
      telefono: customer.defaultAddress.telefono,
      nombreDestinatario: customer.defaultAddress.nombreDestinatario,
    };
  }

  const reservationMinutes =
    (metodoEntrega === "WHATSAPP" || payload.metodoPago === "EFECTIVO") ? 60 * 48 : 30;

  return runInTransaction(async (session) => {
    const { validatedItems } = await getValidatedCartForCheckout(
      customerId,
      session
    );
    const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal;

    for (const { producto, variante, cartItem } of validatedItems) {
      if (getAvailableStockForVariant(variante) < cartItem.cantidad) {
        throw new AppError(
          `Stock insuficiente para ${producto.nombre} ${variante.color}/${variante.talla}`,
          400
        );
      }
      await reserveStockForOrder(
        {
          producto,
          variante,
          cantidad: cartItem.cantidad,
        },
        session
      );
    }

    const estadoEntrega = metodoEntrega === "WHATSAPP" ? "NOT_APPLICABLE" : "PENDING";

    const itemsProcesados = validatedItems.map(({ producto, variante, cartItem, precioUnitario }) => {
      const ganancia = (precioUnitario - producto.precioCosto) * cartItem.cantidad;
      return {
        productoId: producto._id,
        variante: {
          varianteId: variante.varianteId,
          color: variante.color,
          colorSecundario: variante.colorSecundario,
          talla: variante.talla,
          codigoBarra: variante.codigoBarra,
          qrCode: variante.qrCode,
        },
        productoSnapshot: {
          nombre: producto.nombre,
          modelo: producto.modelo,
          sku: producto.sku,
          imagen: cartItem.productoSnapshot.imagen,
        },
        cantidad: cartItem.cantidad,
        precioUnitario,
        totalLinea: precioUnitario * cartItem.cantidad,
        precioCosto: producto.precioCosto,
        ganancia
      };
    });

    const gananciaTotal = itemsProcesados.reduce((sum, item) => sum + item.ganancia, 0);

    const pedido = await pedidosRepository.create({
      numeroPedido: createPedidoNumber(),
      canal: "WEB",
      estadoPedido: "PENDING_PAYMENT",
      estadoPago: "PENDING",
      estadoEntrega,
      estadoReservaStock: "RESERVED",
      reservadoEn: new Date(),
      reservaExpiraEn: createReservationExpirationDate(reservationMinutes),
      metodoPago: payload.metodoPago,
      cliente: customerId,
      vendedor: null,
      snapshotCliente: {
        usuarioId: customer.user._id,
        nombreCompleto: customer.user.nombreCompleto,
        email: customer.user.email,
        telefono: (snapshotEntrega?.telefono as string) || customer.profile?.telefono || customer.defaultAddress?.telefono || null,
        tipoDocumento: customer.profile?.tipoDocumento || null,
        numeroDocumento: customer.profile?.numeroDocumento || null,
      },
      snapshotEntrega,
      items: itemsProcesados,
      subtotal,
      descuento: 0,
      total,
      gananciaTotal,
      notas: payload.notas || null,
    }, session);

    // Sync fulfillment will be updated to use Pedido in its own phase, but we keep the call assuming it will adapt
    await syncFulfillmentForOrder(pedido, session);

    await clearCartByUserId(customerId, session);

    await recordAuditEventSafe(
      {
        accion: "PEDIDO_CHECKOUT",
        tipoEntidad: "PEDIDO",
        idEntidad: pedido._id.toString(),
        idActor: customerId,
        rolActor: "CLIENTE",
        estado: "SUCCESS",
        metadata: {
          canal: pedido.canal,
          metodoEntrega,
          total: pedido.total,
          items: pedido.items.length,
        },
      },
      session
    );

    return pedido;
  });
}

export async function crearVentaDirecta(
  actor: { id: string; rol: "ADMIN" | "VENDEDOR" },
  payload: CreatePedidoInput
) {
  await connectDB();

  return runInTransaction(async (session) => {
    let subtotal = 0;
    let gananciaTotal = 0;
    const itemsProcesados = [];

    for (const item of payload.items) {
      const producto = await Producto.findById(item.productoId).session(session);
      if (!producto) throw new AppError(`Producto no encontrado`, 404);

      const variante = findVariantByIdentity(producto.variantes as Variante[], {
        varianteId: item.varianteId,
        color: item.color,
        colorSecundario: item.colorSecundario,
        talla: item.talla,
      });

      if (!variante) throw new AppError(`Variante no encontrada`, 404);
      if (getAvailableStockForVariant(variante) < item.cantidad) {
        throw new AppError(`Stock insuficiente`, 400);
      }

      await consumeReservedStockForOrder({
        producto,
        variante,
        cantidad: item.cantidad,
        userId: actor.id,
        motivo: `Venta directa ${payload.canal}`,
        referencia: "VENTA_DIRECTA"
      }, session);

      const precioUnitario = producto.precioVenta;
      const totalLinea = precioUnitario * item.cantidad;
      const ganancia = (precioUnitario - producto.precioCosto) * item.cantidad;

      subtotal += totalLinea;
      gananciaTotal += ganancia;

      itemsProcesados.push({
        productoId: producto._id,
        variante: {
          varianteId: variante.varianteId,
          color: variante.color,
          colorSecundario: variante.colorSecundario,
          talla: variante.talla,
          codigoBarra: variante.codigoBarra,
          qrCode: variante.qrCode,
        },
        productoSnapshot: {
          nombre: producto.nombre,
          modelo: producto.modelo,
          sku: producto.sku,
          imagen: variante.imagenes?.[0] || producto.imagenes?.[0],
        },
        cantidad: item.cantidad,
        precioUnitario,
        totalLinea,
        precioCosto: producto.precioCosto,
        ganancia
      });
    }

    const descuentoAplicado = payload.descuento || 0;
    const multiplicadorDescuento = 1 - descuentoAplicado / 100;
    const total = subtotal * multiplicadorDescuento;

    const pedido = await pedidosRepository.create({
      numeroPedido: createPedidoNumber(),
      canal: payload.canal,
      estadoPedido: "DELIVERED",
      estadoPago: "PAID",
      estadoEntrega: "NOT_APPLICABLE",
      estadoReservaStock: "CONSUMED",
      metodoPago: payload.metodoPago,
      cliente: null,
      vendedor: actor.id,
      items: itemsProcesados,
      subtotal,
      descuento: descuentoAplicado,
      total,
      gananciaTotal,
    }, session);

    await recordAuditEventSafe({
      accion: "VENTA_DIRECTA_CREADA",
      tipoEntidad: "PEDIDO",
      idEntidad: pedido._id.toString(),
      idActor: actor.id,
      rolActor: actor.rol,
      estado: "SUCCESS",
      metadata: { total: pedido.total, canal: pedido.canal }
    }, session);

    return pedido;
  });
}

function sanitizePedidoForCustomer(pedido: Record<string, unknown>) {
  const sanitized = { ...pedido };
  if (Array.isArray(sanitized.items)) {
    sanitized.items = sanitized.items.map((item: Record<string, unknown>) => {
      const rest = { ...item };
      delete rest.precioCosto;
      delete rest.ganancia;
      return rest;
    });
  }
  delete sanitized.gananciaTotal;
  return sanitized;
}

export async function listPedidosForActor(role: string, userId: string) {
  await connectDB();

  if (role === "CLIENTE") {
    const pedidos = await pedidosRepository.listByCustomer(userId);
    return pedidos.map(p => sanitizePedidoForCustomer(p.toObject()));
  }

  if (["ADMIN", "VENDEDOR"].includes(role)) {
    return pedidosRepository.listAll();
  }

  throw new AppError("No autorizado", 403);
}

export async function getPedidoForActor(role: string, userId: string, id: string) {
  assertObjectId(id, "ID de pedido invalido");
  await connectDB();

  const pedido =
    role === "CLIENTE"
      ? await pedidosRepository.findByIdForCustomer(id, userId)
      : await pedidosRepository.findById(id);

  if (!pedido) {
    throw new AppError("Pedido no encontrado", 404);
  }

  return role === "CLIENTE" ? sanitizePedidoForCustomer(pedido.toObject()) : pedido;
}

export async function updateEstadoPedidoForStaff(
  id: string,
  payload: UpdateEstadoPedidoInput
) {
  assertObjectId(id, "ID de pedido invalido");
  await connectDB();

  return runInTransaction(async (session) => {
    const currentPedido = await pedidosRepository.findById(id, session);

    if (!currentPedido) {
      throw new AppError("Pedido no encontrado", 404);
    }

    const nextPayload: Record<string, unknown> = { ...payload };

    if (payload.estadoPedido === "CANCELLED") {
      if (!payload.estadoEntrega) {
        nextPayload.estadoEntrega = "CANCELLED";
      }

      if (
        currentPedido.estadoReservaStock === "RESERVED" &&
        currentPedido.estadoPago !== "PAID"
      ) {
        await releasePedidoReservation(currentPedido, session);
        nextPayload.estadoReservaStock = "RELEASED";
        nextPayload.estadoPago = payload.estadoPago || "FAILED";
        nextPayload.reservadoEn = null;
        nextPayload.reservaExpiraEn = null;
      }
    }

    Object.assign(currentPedido, nextPayload);
    await currentPedido.save({ session });
    await syncFulfillmentForOrder(currentPedido, session);

    await recordAuditEventSafe(
      {
        accion: "PEDIDO_STATUS_UPDATED",
        tipoEntidad: "PEDIDO",
        idEntidad: currentPedido._id.toString(),
        estado: "SUCCESS",
        metadata: {
          estadoPedido: currentPedido.estadoPedido,
          estadoPago: currentPedido.estadoPago,
          estadoEntrega: currentPedido.estadoEntrega,
        },
      },
      session
    );

    return currentPedido;
  });
}

export async function cancelPedidoForCustomer(id: string, customerId: string) {
  assertObjectId(id, "ID de pedido invalido");
  await connectDB();

  return runInTransaction(async (session) => {
    const pedido = await pedidosRepository.findByIdForCustomer(id, customerId, session);

    if (!pedido) {
      throw new AppError("Pedido no encontrado o no pertenece al cliente", 404);
    }

    if (pedido.estadoPedido !== "PENDING_PAYMENT") {
      throw new AppError("Solo se pueden cancelar pedidos pendientes de pago", 400);
    }

    if (pedido.estadoReservaStock === "RESERVED") {
      await releasePedidoReservation(pedido, session);
    }

    pedido.estadoPedido = "CANCELLED";
    pedido.estadoPago = "FAILED";
    pedido.estadoEntrega = "CANCELLED";
    pedido.estadoReservaStock = "RELEASED";
    pedido.reservadoEn = null;
    pedido.reservaExpiraEn = null;

    await pedido.save({ session });

    await recordAuditEventSafe({
      accion: "PEDIDO_CANCELLED_BY_CUSTOMER",
      tipoEntidad: "PEDIDO",
      idEntidad: pedido._id.toString(),
      idActor: customerId,
      rolActor: "CLIENTE",
      estado: "SUCCESS",
    }, session);

    return pedido;
  });
}

export async function updatePedidoEntregaForCustomer(
  id: string,
  customerId: string,
  deliveryData: UpdatePedidoEntregaInput
) {
  assertObjectId(id, "ID de pedido invalido");
  await connectDB();

  return runInTransaction(async (session) => {
    const pedido = await pedidosRepository.findByIdForCustomer(id, customerId, session);

    if (!pedido) {
      throw new AppError("Pedido no encontrado o no pertenece al cliente", 404);
    }

    if (pedido.estadoPedido !== "PENDING_PAYMENT") {
      throw new AppError("Solo se pueden editar pedidos pendientes de pago", 400);
    }

    const now = new Date();
    const createdAt = new Date(pedido.createdAt);
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins > 30) {
      throw new AppError("El plazo para editar el pedido (30 min) ha expirado", 403);
    }

    pedido.snapshotEntrega = {
      ...pedido.snapshotEntrega,
      ...deliveryData,
    };

    await pedido.save({ session });

    await recordAuditEventSafe({
      accion: "PEDIDO_DELIVERY_UPDATED_BY_CUSTOMER",
      tipoEntidad: "PEDIDO",
      idEntidad: pedido._id.toString(),
      idActor: customerId,
      rolActor: "CLIENTE",
      estado: "SUCCESS",
    }, session);

    return pedido;
  });
}

export async function confirmPedidoForDelivery(
  id: string,
  actor: { id: string; rol: AuditActorRole }
) {
  assertObjectId(id, "ID de pedido invalido");
  await connectDB();

  return runInTransaction(async (session) => {
    const pedido = await pedidosRepository.findById(id, session);

    if (!pedido) {
      throw new AppError("Pedido no encontrado", 404);
    }

    if (pedido.estadoPedido !== "PENDING_PAYMENT") {
      throw new AppError("El pedido ya no esta pendiente de pago", 400);
    }

    pedido.estadoPedido = "CONFIRMED";
    pedido.reservaExpiraEn = null;

    await pedido.save({ session });

    await recordAuditEventSafe(
      {
        accion: "PEDIDO_CONFIRMED_FOR_DELIVERY",
        tipoEntidad: "PEDIDO",
        idEntidad: pedido._id.toString(),
        idActor: actor.id,
        rolActor: actor.rol,
        estado: "SUCCESS",
      },
      session
    );

    return pedido;
  });
}
